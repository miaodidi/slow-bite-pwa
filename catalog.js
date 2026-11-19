// Personal, offline catalog. Prices and delivery estimates are sample data.
const SHOPS = [
  {id:'heytea',name:'喜茶(北京清华东南门店)',image:'heytea',category:'甜点饮品',sales:'7000+',rating:'4.9',min:20,fee:1.8,distance:'1.1km',eta:28,rank:'五道口奶茶果汁商家排行榜第1名',coupons:['满32减13','满40减18'],tags:['无明厨亮灶','人气好店'],brand:'喜茶 HEYTEA',notice:'喜茶，一杯好茶的灵感。选用真茶、真奶、真果，让每一口都有好心情。',menu:[
    {id:'grape',name:'多肉葡萄',desc:'当季巨峰葡萄 · 清新绿妍茶底',price:19,original:23,image:'tea',sold:823,group:'人气必点',options:true},
    {id:'mango',name:'多肉芒芒甘露',desc:'芒果果肉 · 椰乳 · 西柚粒',price:22,original:26,image:'tea',sold:631,group:'人气必点',options:true},
    {id:'matcha',name:'轻抹·云顶',desc:'清香抹茶 · 轻盈云顶',price:18,original:22,image:'ice',sold:326,group:'清爽果茶',options:true},
    {id:'lemon',name:'暴打柠檬绿茶',desc:'鲜切柠檬 · 清新绿妍',price:13,original:16,image:'tea',sold:902,group:'清爽果茶',options:true},
    {id:'milk',name:'烤黑糖波波牛乳',desc:'黑糖珍珠 · 醇厚牛乳',price:19,original:23,image:'milk',sold:458,group:'醇香牛乳',options:true}
  ]},
  {id:'qixian',name:'七鲜超市(志新桥仓)',image:'qixian',category:'超市便利',sales:'1万+',rating:'4.8',min:0,fee:6,distance:'3.1km',eta:37,rank:'北京超市便利人气榜第1名',coupons:['满89减20','满149减40'],tags:['明厨亮灶','品质优选'],brand:'七鲜超市',notice:'新鲜好物，随心选购。水果、轻食、夜宵，一站选齐。',menu:[
    {id:'fruit-box',name:'鲜切水果拼盘',desc:'当季鲜果 · 清甜多汁 · 约350g',price:19.9,original:25.9,image:'fruit',sold:238,group:'精选好物'},
    {id:'yogurt',name:'原味酸奶水果碗',desc:'浓醇酸奶搭配清新水果',price:15.9,original:19.9,image:'milk',sold:128,group:'精选好物'},
    {id:'dinner',name:'香辣拌面单人餐',desc:'香辣过瘾 · 热食现做',price:22.9,original:29.9,image:'noodles',sold:362,group:'即食美味'}
  ]},
  {id:'luckin',name:'瑞幸咖啡(清华同方科技广场店)',image:'luckin',category:'甜点饮品',sales:'8000+',rating:'4.9',min:20,fee:0,distance:'29m',eta:15,rank:'海淀区咖啡回购榜第1名',coupons:['满38减13','满50减18'],tags:['明厨亮灶','支持自取'],brand:'luckin coffee',notice:'这一杯，刚刚好。现磨咖啡，让今天多一点香气。',menu:[
    {id:'coconut',name:'生椰拿铁',desc:'现萃咖啡 · 冷压生椰乳',price:18,original:29,image:'luckin',sold:1563,group:'人气必点',options:true},
    {id:'velvet',name:'丝绒拿铁',desc:'香醇浓缩 · 丝滑厚乳',price:19,original:32,image:'luckin',sold:836,group:'人气必点',options:true},
    {id:'americano',name:'经典美式',desc:'新鲜现磨 · 醇香回甘',price:13,original:23,image:'luckin',sold:1032,group:'大师咖啡',options:true},
    {id:'latte',name:'抹茶燕麦拿铁',desc:'清新抹茶 · 顺滑燕麦乳',price:21,original:32,image:'ice',sold:265,group:'风味特调',options:true}
  ]},
  {id:'pancake',name:'画大饼烤炉鸡蛋灌饼(五道口店)',image:'pancake',category:'美食',sales:'1000+',rating:'4.8',min:20,fee:0,distance:'969m',eta:28,rank:'五道口小吃快餐好评榜第3名',coupons:['满25减5','满40减10'],tags:['明厨亮灶','现点现做'],brand:'画大饼 · 烤炉鸡蛋灌饼',notice:'外酥里嫩，现烤现做。酱料、辣度可以在订单备注中告诉我们。',menu:[
    {id:'classic',name:'招牌烤炉鸡蛋灌饼',desc:'酥脆饼皮 · 整颗鸡蛋 · 生菜',price:12,original:16,image:'pancake',sold:826,group:'招牌推荐'},
    {id:'double',name:'双蛋双肠豪华灌饼',desc:'双份满足 · 热乎出炉',price:19,original:24,image:'pancake',sold:567,group:'招牌推荐'},
    {id:'meal',name:'灌饼＋牛乳单人套餐',desc:'招牌灌饼一份 · 牛乳一杯',price:25,original:32,image:'pancake',sold:326,group:'超值套餐'},
    {id:'milk',name:'香浓牛乳',desc:'温润奶香 · 250ml',price:8,original:10,image:'milk',sold:185,group:'饮品小食'}
  ]},
  {id:'fruit',name:'切果 NOW(清华大学店)',image:'fruit',category:'蔬菜水果',sales:'6000+',rating:'4.9',min:20,fee:1,distance:'2.1km',eta:36,rank:'五道口水果热销榜第1名',coupons:['满30减10','满49减18'],tags:['明厨亮灶','新鲜现切'],brand:'切果 NOW',notice:'新鲜现切，刚好一人份。把今天的维生素安排上。',menu:[
    {id:'watermelon',name:'清甜西瓜鲜切盒',desc:'清甜爽口 · 约400g',price:14.9,original:19.9,image:'fruit',sold:1359,group:'鲜切水果'},
    {id:'mixed',name:'缤纷水果四拼',desc:'当季四种鲜果 · 约500g',price:26.9,original:36.9,image:'fruit',sold:862,group:'鲜切水果'},
    {id:'bowl',name:'水果酸奶碗',desc:'鲜果与酸奶的清爽搭配',price:22,original:28,image:'milk',sold:328,group:'轻食果碗'}
  ]},
  {id:'burger',name:'本楼汉堡(中关村领展店)',image:'burger',category:'美食',sales:'3000+',rating:'4.8',min:20,fee:0,distance:'1.8km',eta:30,rank:'中关村汉堡人气榜第2名',coupons:['满38减13','满60减20'],tags:['明厨亮灶','现烤堡胚'],brand:'本楼汉堡',notice:'现烤堡胚，一口好满足。汉堡、薯条和快乐都给你备好了。',menu:[
    {id:'beef',name:'招牌厚牛肉汉堡',desc:'厚切牛肉饼 · 芝士 · 新鲜生菜',price:26,original:32,image:'burger',sold:762,group:'人气必点'},
    {id:'chicken',name:'香辣脆鸡腿堡',desc:'外脆里嫩 · 微辣多汁',price:22,original:28,image:'burger',sold:923,group:'人气必点'},
    {id:'combo',name:'厚牛堡薯条可乐套餐',desc:'招牌厚牛堡＋薯条＋可乐',price:38,original:48,image:'burger',sold:512,group:'超值套餐'},
    {id:'fries',name:'金黄酥脆薯条',desc:'金黄香脆 · 现炸出锅',price:12,original:16,image:'burger',sold:682,group:'美味小食'}
  ]},
  {id:'mumou',name:'Mumou韩国冰(五道口店)',image:'ice',category:'甜点饮品',sales:'1000+',rating:'4.8',min:0,fee:0,distance:'1.2km',eta:25,rank:'五道口冰品人气好店',coupons:['满30减5','满50减12'],tags:['清爽冰品','现点现做'],brand:'Mumou 韩国冰',notice:'绵密冰沙和清新果味，给今天一点甜。',menu:[
    {id:'ice',name:'Mumou韩式绵绵冰',desc:'细腻绵绵冰 · 清爽果味',price:16.1,original:25,image:'ice',sold:586,group:'人气必点',options:true},
    {id:'double',name:'双杯分享套餐',desc:'两杯快乐 · 风味任选',price:30,original:46,image:'ice',sold:259,group:'双人分享',options:true}
  ]},
  {id:'maiji',name:'麦记牛奶公司(五道口店)',image:'milk',category:'甜点饮品',sales:'2000+',rating:'4.9',min:0,fee:0,distance:'1.3km',eta:26,rank:'五道口甜品回购榜第2名',coupons:['满30减6','满50减12'],tags:['每日鲜制','人气甜品'],brand:'麦记牛奶',notice:'一碗香浓牛奶甜品，慢慢享受。',menu:[
    {id:'bowl',name:'夏日清爽牛奶碗',desc:'香浓牛奶底 · 小料丰富',price:15.9,original:25.6,image:'milk',sold:638,group:'招牌推荐'},
    {id:'double',name:'双皮奶双人套餐',desc:'经典奶香 · 两份装',price:28,original:36,image:'milk',sold:321,group:'超值套餐'}
  ]},
  {id:'noodles',name:'西雅苏新疆炒米粉(五道口店)',image:'noodles',category:'美食',sales:'4000+',rating:'4.8',min:0,fee:0,distance:'1.7km',eta:27,rank:'五道口米粉人气榜第2名',coupons:['满30减6','满45减12'],tags:['明厨亮灶','爆炒鲜香'],brand:'西雅苏 · 新疆炒米粉',notice:'酱香浓郁，鲜香够味。不吃香菜或有辣度偏好请备注。',menu:[
    {id:'all',name:'全家福新疆炒米粉',desc:'鸡肉＋牛肉＋年糕 · 酱香浓郁',price:14.74,original:28,image:'noodles',sold:1836,group:'人气必点'},
    {id:'beef',name:'酱香牛肉炒米粉',desc:'爽滑米粉 · 鲜嫩牛肉',price:22,original:28,image:'noodles',sold:962,group:'招牌米粉'},
    {id:'chicken',name:'经典鸡肉炒米粉',desc:'现炒鸡肉 · 香辣过瘾',price:19,original:25,image:'noodles',sold:1263,group:'招牌米粉'}
  ]},
  {id:'tea',name:'沪上阿姨鲜果茶(五道口店)',image:'tea',category:'甜点饮品',sales:'5000+',rating:'4.9',min:0,fee:0,distance:'1.5km',eta:23,rank:'五道口鲜果茶人气好店',coupons:['满28减5','满40减10'],tags:['新鲜果茶','好喝不贵'],brand:'沪上阿姨 · 鲜果茶',notice:'鲜果鲜茶，好喝的每一杯。',menu:[
    {id:'fruit',name:'鲜果茶人气三选一',desc:'杨枝甘露 / 满杯百香果 / 葡萄果茶',price:10.58,original:18,image:'tea',sold:986,group:'人气必点',options:true},
    {id:'milk',name:'厚乳芋泥波波奶茶',desc:'绵密芋泥 · 香醇厚乳',price:16,original:20,image:'milk',sold:726,group:'香醇奶茶',options:true}
  ]}
];
const CATEGORIES = [
  ['美食','food'],['甜点饮品','drink'],['超市便利','market'],['蔬菜水果','produce'],['看病买药','medicine'],
  ['午餐','lunch'],['拼好饭','group'],['秒杀','flash'],['跑腿','runner'],['天天津贴','subsidy']
];
const PROMOS = [
  {shop:'mumou',image:'ice',title:'Mumou',sub:'mumou韩国冰',price:'16.1',note:'买贵必赔'},
  {shop:'maiji',image:'milk',title:'麦记牛奶',sub:'夏日清爽五选一',price:'15.9',note:'享6.2折'},
  {shop:'noodles',image:'noodles',title:'西雅苏',sub:'全家福新疆炒米粉',price:'14.74',note:'到手价'},
  {shop:'tea',image:'tea',title:'沪上阿姨鲜果茶',sub:'果茶奶茶爆品3选',price:'10.58',note:'到手价'}
];
