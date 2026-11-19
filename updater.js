const APP_RELEASE = {version:'development',build:'local',id:'development',publishedAt:null}; // BUILD_RELEASE

class AppUpdater {
  constructor({current, baseURL, onChange=()=>{}, beforeReload=()=>{}, reload=()=>location.reload(), platform=globalThis}) {
    Object.assign(this, {current,baseURL,onChange,beforeReload,reload,platform});
    this.state = {phase:'idle',latest:null,checkedAt:null,error:''};
    this.checkTask = null;
    this.applyTask = null;
  }
  setState(patch) { Object.assign(this.state,patch);this.onChange(this.state); }
  async fetchRelease() {
    const url = new URL('version.json', this.baseURL);
    url.searchParams.set('_check', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),12000);
    try {
      const response = await this.platform.fetch(url, {cache:'no-store',signal:controller.signal});
      if (!response.ok) throw new Error('版本服务暂时不可用');
      const release = await response.json();
      if (!release || typeof release.id !== 'string' || !/^[\w.-]{1,120}$/.test(release.id) ||
          typeof release.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(release.version) ||
          typeof release.build !== 'string' || !/^[\w.-]{1,80}$/.test(release.build)) {
        throw new Error('版本信息异常，请稍后重试');
      }
      return release;
    } finally { clearTimeout(timeout); }
  }
  check() {
    if (this.applyTask) return this.applyTask;
    if (this.checkTask) return this.checkTask;
    this.setState({phase:'checking',error:''});
    this.checkTask = (async()=>{
      try {
        const latest = await this.fetchRelease();
        this.setState({latest,checkedAt:Date.now(),phase:latest.id === this.current.id ? 'current' : 'available'});
        return latest;
      } catch (error) {
        this.setState({phase:'error',error:this.platform.navigator.onLine === false ? '当前离线，联网后再试' : '检查失败，请检查网络后重试'});
        return null;
      } finally { this.checkTask = null; }
    })();
    return this.checkTask;
  }
  async register() {
    if (!this.platform.navigator.serviceWorker) throw new Error('当前环境无法更新，请用 Safari 打开');
    return this.platform.navigator.serviceWorker.register(new URL('sw.js',this.baseURL), {scope:this.baseURL,updateViaCache:'none'});
  }
  workerRelease(worker) {
    if (!worker) return Promise.reject(new Error('更新程序尚未就绪'));
    return new Promise((resolve,reject)=>{
      const channel = new this.platform.MessageChannel();
      const done = (error,value)=>{clearTimeout(timer);channel.port1.close();error?reject(error):resolve(value);};
      const timer = setTimeout(()=>done(new Error('更新程序响应超时')),3000);
      channel.port1.onmessage = event=>done(null,event.data);
      try { worker.postMessage({type:'GET_RELEASE'},[channel.port2]); }
      catch(error) {done(error);}
    });
  }
  waitForRelease(registration, id) {
    return new Promise((resolve,reject)=>{
      let finished=false, inspecting=false;
      const listeners=new Map();
      const done=(error,worker)=>{
        if(finished)return;finished=true;clearTimeout(timeout);
        registration.removeEventListener('updatefound',inspect);
        for(const [w,fn] of listeners)w.removeEventListener('statechange',fn);
        error?reject(error):resolve(worker);
      };
      const inspect=async()=>{
        if(finished)return;
        const installing=registration.installing;
        if(installing&&!listeners.has(installing)){
          const fn=()=>{if(installing.state==='redundant')done(new Error('新版下载未完成，请重试'));else inspect();};
          listeners.set(installing,fn);installing.addEventListener('statechange',fn);
        }
        if(inspecting)return;inspecting=true;
        try {
          const candidates=[registration.waiting,registration.active].filter(Boolean);
          for(const worker of candidates) {
            try {if((await this.workerRelease(worker))?.id===id){done(null,worker);return;}}catch{}
          }
          if([registration.waiting,registration.active].some(worker=>worker&&!candidates.includes(worker))){inspecting=false;inspect();return;}
        } finally {inspecting=false;}
        if(!registration.installing&&!finished)done(new Error('新版正在发布，请稍后重试'));
      };
      const timeout=setTimeout(()=>done(new Error('下载超时，当前版本仍可继续使用')),45000);
      registration.addEventListener('updatefound',inspect);inspect();
    });
  }
  async activate(worker,id) {
    const service=this.platform.navigator.serviceWorker;
    try {if((await this.workerRelease(service.controller))?.id===id)return;}catch{}
    await new Promise((resolve,reject)=>{
      let done=false;
      const finish=error=>{if(done)return;done=true;clearTimeout(timer);service.removeEventListener('controllerchange',inspect);error?reject(error):resolve();};
      const inspect=async()=>{try {if((await this.workerRelease(service.controller))?.id===id)finish();}catch{}};
      const timer=setTimeout(()=>finish(new Error('切换版本超时，请重试')),15000);
      service.addEventListener('controllerchange',inspect);
      worker.postMessage({type:'ACTIVATE_RELEASE',id});
      inspect();
    });
  }
  apply() {
    if(this.applyTask)return this.applyTask;
    this.applyTask=(async()=>{
      try {
        if(this.checkTask)await this.checkTask;
        this.setState({phase:'updating',error:'',step:'正在确认最新版本…'});
        // Re-check at the action boundary: another release may have appeared meanwhile.
        const latest=await this.fetchRelease();
        this.setState({latest,step:'正在下载新版，请稍候…'});
        const registration=await this.register();
        await registration.update();
        const worker=await this.waitForRelease(registration,latest.id);
        await this.beforeReload(latest);
        this.setState({step:'下载完成，正在切换版本…'});
        await this.activate(worker,latest.id);
        this.reload(latest);
        return true;
      } catch(error) {
        this.setState({phase:'error',error:this.platform.navigator.onLine===false?'当前离线，联网后再更新':(error.message||'更新失败，请稍后重试')});
        return false;
      } finally {this.applyTask=null;}
    })();
    return this.applyTask;
  }
  async start() {
    try {
      const registration=await this.register();
      // Migration from the old network-first worker: this page already loaded the
      // same new release, so it is safe to let that exact worker take control.
      const adopt=async()=>{
        const worker=registration.waiting;
        if(worker && (await this.workerRelease(worker))?.id===this.current.id) {
          worker.postMessage({type:'ACTIVATE_RELEASE',id:this.current.id});
        }
      };
      const track=()=>{const worker=registration.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed')adopt().catch(()=>{});});};
      registration.addEventListener('updatefound',track);track();await adopt();
    } catch { /* A cached app remains usable without a network connection. */ }
  }
}
