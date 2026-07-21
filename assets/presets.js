/* 扉页 · 预设测试库
 * 每套测试与用户自建测试共用同一份 schema（见 skill/doubao-skill.md）。
 * scores 里的数字是权重：2 = 主要倾向，1 = 次要倾向。 */

window.FEIYE_PRESETS = [
{
  id: "wenxue-yuanxing",
  title: "你的文学原型",
  subtitle: "十二个瞬间，照见你在世界文学里的倒影",
  tag: "世界文学 · 十二题",
  desc: "有些书你没读过，却早已活在里面。回答十二个关于日常的问题，找出哪一个文学人物，正用你的方式活着。",
  questions: [
    {
      q: "深夜两点醒来，你最可能在想什么？",
      options: [
        { text: "白天那句没说出口的话", scores: { daiyu: 2, jane: 1 } },
        { text: "没什么，听了一会儿雨声，又睡了", scores: { mersault: 2, siddhartha: 1 } },
        { text: "一个突然清晰起来的计划，恨不得立刻天亮", scores: { quixote: 2, gatsby: 1 } },
        { text: "很多年前的某个夏天", scores: { gatsby: 2, stoner: 1 } }
      ]
    },
    {
      q: "聚会散场，你独自走在回家的路上：",
      options: [
        { text: "复盘刚才每个人说的话，有几句值得玩味", scores: { lizzy: 2, daiyu: 1 } },
        { text: "感到一种轻微的解脱", scores: { mersault: 2, stoner: 1 } },
        { text: "意犹未尽，盘算着下次把那个话题聊完", scores: { quixote: 2, gatsby: 1 } },
        { text: "很平静，像退潮之后的沙滩", scores: { siddhartha: 2, jane: 1 } }
      ]
    },
    {
      q: "如果可以选，你更愿意住在：",
      options: [
        { text: "一座藏书很多、冬天烧壁炉的老房子", scores: { jane: 2, stoner: 1 } },
        { text: "海边，窗子永远开着", scores: { mersault: 2, siddhartha: 1 } },
        { text: "城市最热闹街区的顶层，灯火在脚下", scores: { gatsby: 2, lizzy: 1 } },
        { text: "住哪儿无所谓，住处只是出发的地方", scores: { quixote: 2, siddhartha: 1 } }
      ]
    },
    {
      q: "面对一条明显不公平的规则，你会：",
      options: [
        { text: "当面说出来，哪怕代价是离开", scores: { jane: 2, quixote: 1 } },
        { text: "心里冷笑一声，按自己的方式绕过去", scores: { lizzy: 2, mersault: 1 } },
        { text: "不动声色地忍下，但在心里记下这笔账", scores: { stoner: 2, daiyu: 1 } },
        { text: "规则是他们的，我的生活是我的", scores: { mersault: 2, siddhartha: 1 } }
      ]
    },
    {
      q: "「成功」这个词，你的真实感受是：",
      options: [
        { text: "那是别人发明的词，与我关系不大", scores: { mersault: 2, siddhartha: 1 } },
        { text: "我要的不是成功，是把心里那件事做成", scores: { quixote: 2, jane: 1 } },
        { text: "如果它能让那个人回头看我一眼，就值得", scores: { gatsby: 2, daiyu: 1 } },
        { text: "安静地把一件事做上几十年，就是我的成功", scores: { stoner: 2, siddhartha: 1 } }
      ]
    },
    {
      q: "恋爱里的你，最接近哪一种？",
      options: [
        { text: "爱得很深，但嘴上从不肯输", scores: { daiyu: 2, lizzy: 1 } },
        { text: "要么不爱，爱了就把整个人生押上去", scores: { gatsby: 2, jane: 1 } },
        { text: "先是势均力敌的对手，然后才是爱人", scores: { lizzy: 2, jane: 1 } },
        { text: "爱是好的，但我不会为它撒谎", scores: { mersault: 2, stoner: 1 } }
      ]
    },
    {
      q: "一本书最打动你的时刻是：",
      options: [
        { text: "某句话像是从我心里偷走的", scores: { daiyu: 2, gatsby: 1 } },
        { text: "主角在所有人反对时，仍然出发", scores: { quixote: 2, jane: 1 } },
        { text: "长久的平淡之下，忽然涌起的深流", scores: { stoner: 2, siddhartha: 1 } },
        { text: "作者诚实到近乎冒犯", scores: { mersault: 2, lizzy: 1 } }
      ]
    },
    {
      q: "在人群中，你通常站在哪里？",
      options: [
        { text: "边缘，带着一点观察者的趣味", scores: { lizzy: 2, mersault: 1 } },
        { text: "中心附近，但心里住着一个远方", scores: { gatsby: 2, quixote: 1 } },
        { text: "哪里安静站哪里，不太需要被看见", scores: { stoner: 2, siddhartha: 1 } },
        { text: "表面合群，其实随时准备转身离开", scores: { daiyu: 2, jane: 1 } }
      ]
    },
    {
      q: "最让你难以忍受的是：",
      options: [
        { text: "虚伪", scores: { mersault: 2, jane: 1 } },
        { text: "平庸地度过一生", scores: { quixote: 2, gatsby: 1 } },
        { text: "被辜负", scores: { daiyu: 2, gatsby: 1 } },
        { text: "失去内心的自由", scores: { siddhartha: 2, lizzy: 1 } }
      ]
    },
    {
      q: "如果人生是一场雨，你是：",
      options: [
        { text: "檐下听雨的人", scores: { stoner: 2, daiyu: 1 } },
        { text: "冒雨赶路的人", scores: { quixote: 2, jane: 1 } },
        { text: "站在雨里，既不躲，也不走的人", scores: { mersault: 2, siddhartha: 1 } },
        { text: "隔着玻璃，看雨中灯火的人", scores: { gatsby: 2, lizzy: 1 } }
      ]
    },
    {
      q: "多年后的同学聚会，你希望自己：",
      options: [
        { text: "不去", scores: { mersault: 2, daiyu: 1 } },
        { text: "去，笑着听完所有人的故事，心里自有一杆秤", scores: { lizzy: 2, stoner: 1 } },
        { text: "成为那个讲出最不可思议的故事的人", scores: { gatsby: 2, quixote: 1 } },
        { text: "去不去都行，我已经不需要向谁证明什么", scores: { siddhartha: 2, jane: 1 } }
      ]
    },
    {
      q: "最后一题。你希望墓志铭上写：",
      options: [
        { text: "「她/他从未向任何人低头」", scores: { jane: 2, mersault: 1 } },
        { text: "「一生都在路上」", scores: { quixote: 2, siddhartha: 1 } },
        { text: "「爱过」", scores: { gatsby: 2, daiyu: 1 } },
        { text: "什么都不写，青草会替我说", scores: { stoner: 2, mersault: 1 } }
      ]
    }
  ],
  results: {
    mersault: {
      name: "默尔索",
      source: "《局外人》 · 加缪",
      quote: "面对这充满预兆和星星的夜，我第一次向这个世界温柔的冷漠敞开了心扉。",
      desc: "你拒绝表演。别人在葬礼上哭，你只是感到困；别人轻易说「爱」，你先问这个词是什么意思。这不是冷漠——是你对真实近乎洁癖的忠诚。你身上有一种罕见的勇气：宁可被世界误解，也不肯对自己撒一次谎。只是偶尔，在黄昏的阳台上，你也会希望有一个人，不需要解释就懂。",
      traits: ["清醒", "疏离", "诚实到底"],
      hue: 215
    },
    daiyu: {
      name: "林黛玉",
      source: "《红楼梦》 · 曹雪芹",
      quote: "质本洁来还洁去，强于污淖陷渠沟。",
      desc: "你的敏感不是软弱，是精度。别人眼里模糊一片的世界，你能看清每一道裂缝——所以你比谁都容易受伤，也比谁都懂得美。你用刻薄保护柔软，用转身掩饰在意。爱你的人需要一点耐心，但他们终会明白：你冷的是这个处处将就的世界，从来不是他们。",
      traits: ["敏感", "深情", "玉的骄傲"],
      hue: 345
    },
    quixote: {
      name: "堂吉诃德",
      source: "《堂吉诃德》 · 塞万提斯",
      quote: "最大的疯狂，也许是照现实原本的样子活着，而不是照它应该的样子。",
      desc: "所有人都看见风车，只有你看见巨人——这不是疯，是你拒绝让「现实」替你决定什么值得一战。你也许屡战屡败，被嘲笑、被劝退、被身边清醒的桑丘们摇头叹息。但几百年过去了，人们记住的从来不是那些聪明的旁观者，而是你冲锋时扬起的尘土。",
      traits: ["理想主义", "行动派", "不合时宜的勇敢"],
      hue: 32
    },
    jane: {
      name: "简·爱",
      source: "《简·爱》 · 夏洛蒂·勃朗特",
      quote: "我们站在上帝脚下，彼此平等——因为我们本来就是平等的。",
      desc: "你可以贫穷、低微、不美，但你从不允许任何人——包括爱情——把你折成更小的形状。你的爱炽热，但有底线；你可以妥协很多，但有一条线从不后退：自尊。你不喧哗，却是任何一个房间里，脊梁最直的人。",
      traits: ["自尊", "独立", "温柔而不可折"],
      hue: 155
    },
    stoner: {
      name: "斯通纳",
      source: "《斯通纳》 · 约翰·威廉斯",
      quote: "你还期望什么呢？",
      desc: "你的一生不会有传奇的章节，但每一页都写得很认真。世界亏欠你的，你不追讨；命运递过来的，你都接住。在别人看来，你也许沉默、迟钝、错过了一切；只有你自己知道，那些独自守着的热爱，是你从未失守的城池。斯通纳式的人生不精彩，但完整。",
      traits: ["坚忍", "沉默的热爱", "完整"],
      hue: 90
    },
    siddhartha: {
      name: "悉达多",
      source: "《悉达多》 · 黑塞",
      quote: "知识可以传授，智慧不能。",
      desc: "你这一生注定要亲自走一遍——别人给的答案，你一个都不肯直接要。你可能换过赛道，离开过让人羡慕的位置，朋友说你「想太多」，只有你知道，那是灵魂在换气。总有一天你会坐在自己的河边，明白所有的弯路，都是必经之路。",
      traits: ["求道", "亲历", "平静的叛逆"],
      hue: 185
    },
    lizzy: {
      name: "伊丽莎白",
      source: "《傲慢与偏见》 · 简·奥斯汀",
      quote: "我的勇气，总是随着别人吓唬我而上涨。",
      desc: "你是宴会上最清醒的那双眼睛。世界的荒谬逃不过你，但你选择用机锋而不是眼泪来回应。你敢承认自己也有偏见——这正是你的可爱之处：傲慢的人从不自省，而你敢对自己开刀。你要的爱情很贵：得先赢得你的尊重，才配得到你的心。",
      traits: ["机智", "清醒", "敢自嘲"],
      hue: 265
    },
    gatsby: {
      name: "盖茨比",
      source: "《了不起的盖茨比》 · 菲茨杰拉德",
      quote: "于是我们奋力向前划，逆流而上的小舟，不停地被浪潮推回过去。",
      desc: "你心里有一盏别人看不见的绿灯。为了靠近它，你可以把自己重造一遍——更好的谈吐，更盛大的宴会，更近一点的距离。人们笑你执迷，却不知道你早就猜到了结局，只是不肯改航向。你的浪漫是一场豪赌：押上全部，只为证明有些东西值得。",
      traits: ["浪漫", "执念", "孤注一掷"],
      hue: 48
    }
  }
},

{
  id: "linghun-zhibiren",
  title: "你的灵魂执笔人",
  subtitle: "如果有位作家替你写日记，那会是谁",
  tag: "作家匹配 · 十题",
  desc: "每个人的内心戏都值得一位专属作家。十道题之后，你会知道：那些你说不出口的部分，一直有人替你写着。",
  questions: [
    {
      q: "你的朋友圈（或者你不发朋友圈这件事）最接近：",
      options: [
        { text: "几乎不发，发也只发风景和食物", scores: { wzq: 2, borges: 1 } },
        { text: "深夜发，清晨删", scores: { dazai: 2, woolf: 1 } },
        { text: "冷不丁一句让人笑出声的怪话", scores: { wxb: 2, wzq: 1 } },
        { text: "精心排版，像一页杂志", scores: { eileen: 2, borges: 1 } }
      ]
    },
    {
      q: "你理想中的一个下午：",
      options: [
        { text: "菜市场转一圈，回家慢慢做一顿饭", scores: { wzq: 2 } },
        { text: "图书馆最深处，查一个没用但迷人的问题", scores: { borges: 2, woolf: 1 } },
        { text: "和喜欢的人有一搭没一搭地闲扯", scores: { wxb: 2, dazai: 1 } },
        { text: "咖啡馆靠窗坐着，给来往的行人默默编故事", scores: { eileen: 2, woolf: 1 } }
      ]
    },
    {
      q: "你对「体面」的态度：",
      options: [
        { text: "体面是留给外人的，舒服是留给自己的", scores: { wzq: 2, wxb: 1 } },
        { text: "体面是一种美学，我愿意为它付出代价", scores: { eileen: 2 } },
        { text: "我常在深夜确认，自己是否配得上白天的体面", scores: { dazai: 2, woolf: 1 } },
        { text: "体面？先定义一下这个词", scores: { borges: 2, wxb: 1 } }
      ]
    },
    {
      q: "记忆里最清晰的往往是：",
      options: [
        { text: "某个具体的味道，比如栀子花，或者炝锅的葱香", scores: { wzq: 2 } },
        { text: "某句话说出口时，房间里光线的样子", scores: { woolf: 2, eileen: 1 } },
        { text: "一个梦，比真实还清楚", scores: { borges: 2, dazai: 1 } },
        { text: "年少时干过的一件混账事，想起来还想笑", scores: { wxb: 2 } }
      ]
    },
    {
      q: "如果写日记，你的开头最可能是：",
      options: [
        { text: "「今天吃了……」", scores: { wzq: 2 } },
        { text: "「生而为人这件事，今天又练习了一天。」", scores: { dazai: 2 } },
        { text: "「时间也许并不存在，但今天存在。」", scores: { borges: 2 } },
        { text: "「下了一整天雨，想起一些无法归档的情绪。」", scores: { woolf: 2, eileen: 1 } }
      ]
    },
    {
      q: "爱情在你这里是：",
      options: [
        { text: "一袭华美的袍", scores: { eileen: 2 } },
        { text: "一场需要勇气的越狱，我愿意当同谋", scores: { wxb: 2 } },
        { text: "我怕它，又忍不住伸手", scores: { dazai: 2, eileen: 1 } },
        { text: "两个人共用一个安静的宇宙", scores: { borges: 2, woolf: 1 } }
      ]
    },
    {
      q: "面对荒诞的处境，你的第一反应：",
      options: [
        { text: "笑，然后认真研究它荒诞的结构", scores: { wxb: 2, borges: 1 } },
        { text: "先把饭吃了，天大的事，吃了饭再说", scores: { wzq: 2 } },
        { text: "表面平静，内心已经写完三千字", scores: { woolf: 2, eileen: 1 } },
        { text: "觉得果然如此，人间本来就是这样", scores: { dazai: 2, eileen: 1 } }
      ]
    },
    {
      q: "你更相信：",
      options: [
        { text: "感官——尝过、摸过、闻过的才是真的", scores: { wzq: 2, wxb: 1 } },
        { text: "逻辑——但要一路推到荒谬为止", scores: { borges: 2, wxb: 1 } },
        { text: "直觉——尤其是那些一闪而过的瞬间", scores: { woolf: 2 } },
        { text: "人性经不起相信，但值得研究", scores: { eileen: 2, dazai: 1 } }
      ]
    },
    {
      q: "深夜的你：",
      options: [
        { text: "已经睡了，养生", scores: { wzq: 2 } },
        { text: "越夜越清醒，思想开始变得有趣", scores: { borges: 2, wxb: 1 } },
        { text: "一边自我厌弃，一边继续熬", scores: { dazai: 2 } },
        { text: "在脑内重播白天的每个瞬间，还配了画外音", scores: { woolf: 2, eileen: 1 } }
      ]
    },
    {
      q: "如果只能留一句话给这个世界：",
      options: [
        { text: "「人间草木，最抚人心。」", scores: { wzq: 2 } },
        { text: "「须知参差多态，乃是幸福的本源。」", scores: { wxb: 2 } },
        { text: "「我爱这个让我痛苦的人间。」", scores: { dazai: 2 } },
        { text: "「我给你我尚未写出的诗，和整个黄昏。」", scores: { borges: 2, woolf: 1 } }
      ]
    }
  ],
  results: {
    dazai: {
      name: "太宰治",
      source: "《人间失格》 · 日本",
      quote: "胆小鬼连幸福都害怕，碰到棉花都会受伤。",
      desc: "替你写日记的是太宰。你习惯在人群里扮演开朗，回家后把面具轻轻放在玄关。你对自己的审判比谁都严苛，却对别人的软弱格外温柔。你以为这是懦弱，其实是感受力过载——你只是比别人多长了几百个痛觉神经。太宰会替你写下那句你不敢承认的话：其实，我很想被爱。",
      traits: ["自省过度", "温柔", "痛觉敏锐"],
      hue: 230
    },
    eileen: {
      name: "张爱玲",
      source: "《倾城之恋》 · 中国",
      quote: "生命是一袭华美的袍，爬满了蚤子。",
      desc: "你看人极准，准到近乎残忍。繁华在你眼里自带底色，你早就知道袍子下面有什么，却依然愿意欣赏它华美的样子——这是你的清醒，也是你的慈悲。你不太露感情，不是没有，是懂得感情一说破就贬值。张爱玲会替你记下那些你笑着略过去的瞬间。",
      traits: ["冷眼", "华丽", "通透"],
      hue: 335
    },
    wzq: {
      name: "汪曾祺",
      source: "《人间草木》 · 中国",
      quote: "四方食事，不过一碗人间烟火。",
      desc: "替你执笔的是汪曾祺——因为你的人生哲学写在饭桌上。别人焦虑宏大叙事，你研究今天的萝卜怎么腌。不是没见过风浪，是见过之后，决定好好吃饭。你的温柔不动声色，像文火，不惊艳，但能把日子炖出滋味。人间草木，在你这里都有名字。",
      traits: ["烟火气", "松弛", "深藏的深情"],
      hue: 100
    },
    borges: {
      name: "博尔赫斯",
      source: "《小径分岔的花园》 · 阿根廷",
      quote: "我心里一直暗暗设想，天堂应该是图书馆的模样。",
      desc: "你的人生一半发生在现实，一半发生在脑内。一个念头能让你走神一下午：时间是不是环形的？梦里的我和现在的我，哪个更真？别人觉得你安静，其实你脑内的图书馆彻夜灯火通明。博尔赫斯会把你的每一次走神，都写成一座小径分岔的花园。",
      traits: ["玄思", "迷宫脑", "安静的浩瀚"],
      hue: 200
    },
    wxb: {
      name: "王小波",
      source: "《黄金时代》 · 中国",
      quote: "一个人只拥有此生此世是不够的，他还应该拥有诗意的世界。",
      desc: "替你写日记的是王小波。你受不了无趣，受不了假正经，受不了「大家都这样」。你用玩笑消解沉重，但玩笑底下有认真——你是真的相信，人该有智慧、有趣味、有爱。特立独行在你这里不是姿态，是天性，就像那只特立独行的猪（这是夸奖）。",
      traits: ["有趣", "反矫情", "自由的骨头"],
      hue: 25
    },
    woolf: {
      name: "伍尔夫",
      source: "《到灯塔去》 · 英国",
      quote: "不必匆忙，不必火花四溅，不必成为别人，只需做自己。",
      desc: "你的一天有两条时间线：外面那条平平无奇，里面那条惊涛骇浪。一句话、一束光、一个眼神，都能在你心里激起十页纸的涟漪。你需要一间自己的房间——物理上的，也是精神上的。伍尔夫会替你记录那些「什么都没发生」的日子里，发生过的一切。",
      traits: ["意识流", "细腻", "自己的房间"],
      hue: 285
    }
  }
},

{
  id: "gudian-hunpo",
  title: "你的古典魂魄",
  subtitle: "一千年前，哪位诗人替你活过一遍",
  tag: "古典诗魂 · 十题",
  desc: "你此刻的困顿与欢喜，一千年前早有人经历过，并且写得比你好。十道题，认领那个替你活过一遍的古人。",
  questions: [
    {
      q: "加班到深夜，走出楼门的那一刻，你心里冒出的是：",
      options: [
        { text: "想大醉一场，明天的事明天再说", scores: { libai: 2 } },
        { text: "想起房贷和家里人，叹口气，把外套拧紧", scores: { dufu: 2 } },
        { text: "也无风雨也无晴，回家", scores: { sushi: 2 } },
        { text: "月色不错，绕远路走回去", scores: { wangwei: 2, tao: 1 } }
      ]
    },
    {
      q: "如果突然获得一年假期：",
      options: [
        { text: "立刻出发。路线？路上再说", scores: { libai: 2, sushi: 1 } },
        { text: "回老家，种点东西，把院子收拾出来", scores: { tao: 2, wangwei: 1 } },
        { text: "访旧友、写点东西、把想吃的都吃一遍", scores: { sushi: 2, qingzhao: 1 } },
        { text: "安排得明明白白，一半时间留给该照顾的人", scores: { dufu: 2 } }
      ]
    },
    {
      q: "你的酒品（或奶茶品）：",
      options: [
        { text: "喝到兴起，会想拉着全桌人去干一件大事", scores: { libai: 2 } },
        { text: "三杯之后，开始担忧时代和朋友的人生", scores: { dufu: 2 } },
        { text: "喝多喝少都行，重要的是聊得来", scores: { sushi: 2, tao: 1 } },
        { text: "微醺刚好，再多一分就想回家", scores: { wangwei: 2, qingzhao: 1 } }
      ]
    },
    {
      q: "遭遇重大变故后，你的自愈方式：",
      options: [
        { text: "走，去更大的山河里把自己稀释掉", scores: { libai: 2, sushi: 1 } },
        { text: "写下来，一个字一个字地把痛钉住", scores: { qingzhao: 2, dufu: 1 } },
        { text: "给自己做顿好的，先把日子过下去", scores: { sushi: 2 } },
        { text: "关起门来，浇花、扫地、静坐", scores: { wangwei: 2, tao: 1 } }
      ]
    },
    {
      q: "身边的人都在内卷，你：",
      options: [
        { text: "卷不动，也看不上——我的战场不在这里", scores: { libai: 2, tao: 1 } },
        { text: "跟着卷。不是为自己，是身后有人要护", scores: { dufu: 2 } },
        { text: "表面躺平，暗中把自己的事做得风生水起", scores: { sushi: 2 } },
        { text: "已经在写辞职信了，人生不该耗在这里", scores: { tao: 2, libai: 1 } }
      ]
    },
    {
      q: "你和故乡的关系：",
      options: [
        { text: "回不去，也放不下，梦里全是旧时月色", scores: { qingzhao: 2, dufu: 1 } },
        { text: "此心安处，即是吾乡", scores: { sushi: 2 } },
        { text: "故乡就是用来远离和想念的", scores: { libai: 2 } },
        { text: "正在筹划回去，或者，已经回去了", scores: { tao: 2, wangwei: 1 } }
      ]
    },
    {
      q: "你最理想的老年：",
      options: [
        { text: "拄杖走天涯，老当益壮", scores: { libai: 2 } },
        { text: "儿孙绕膝，家国安稳，比什么都强", scores: { dufu: 2 } },
        { text: "一个小园子，几个旧友，一壶新茶", scores: { tao: 2, wangwei: 1 } },
        { text: "守着满屋书画金石，和一个懂的人", scores: { qingzhao: 2 } }
      ]
    },
    {
      q: "朋友对你的评价，最接近：",
      options: [
        { text: "「这人身上有股仙气，或者说，疯气」", scores: { libai: 2 } },
        { text: "「靠谱，重感情，操心命」", scores: { dufu: 2 } },
        { text: "「跟他在一起，倒霉事都会变得好笑」", scores: { sushi: 2 } },
        { text: "「安静，但开口句句有分量」", scores: { wangwei: 2, qingzhao: 1 } }
      ]
    },
    {
      q: "你对「失去」的理解：",
      options: [
        { text: "天生我材必有用——失去的会以别的方式回来", scores: { libai: 2, sushi: 1 } },
        { text: "失去教会我，更用力守住还在的", scores: { dufu: 2, qingzhao: 1 } },
        { text: "物是人非事事休。有些失去，无法安慰", scores: { qingzhao: 2 } },
        { text: "得失如云烟，本来无一物", scores: { tao: 2, wangwei: 1 } }
      ]
    },
    {
      q: "给你的人生选一个底色：",
      options: [
        { text: "盛大的金", scores: { libai: 2 } },
        { text: "沉郁的青", scores: { dufu: 2, qingzhao: 1 } },
        { text: "温厚的赭", scores: { sushi: 2, tao: 1 } },
        { text: "空翠的绿", scores: { wangwei: 2, tao: 1 } }
      ]
    }
  ],
  results: {
    libai: {
      name: "李白",
      source: "字太白 · 号青莲居士",
      quote: "天生我材必有用，千金散尽还复来。",
      desc: "你的魂魄里住着盛唐。规矩、编制、五斗米，都拴不住你——你总觉得人生该有更盛大的活法。你常被人说「不切实际」，但你心里清楚：切实际的人那么多，不缺你一个。你的天真是真的，狂也是真的。而且你运气不会太差——天真到底的人，天地都会让他三分。",
      traits: ["狂放", "天真", "盛大"],
      hue: 45
    },
    dufu: {
      name: "杜甫",
      source: "字子美 · 世称诗圣",
      quote: "安得广厦千万间，大庇天下寒士俱欢颜。",
      desc: "你是那种把别人扛在肩上的人。自己淋着雨，先想到的却是天下没伞的人。你活得比谁都重，因为你从不肯把责任放下来；也活得比谁都深，因为你的悲悯是真的。世道给你风霜，你还它诗史。做你的家人和朋友，是一种福气。",
      traits: ["悲悯", "担当", "沉郁的深情"],
      hue: 210
    },
    sushi: {
      name: "苏轼",
      source: "字子瞻 · 号东坡居士",
      quote: "竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。",
      desc: "你是被扔到哪里，都能活出滋味的人。命运给你落石，你拿来砌灶台；给你荒地，你种出东坡肉和诗。你的乐观不是没心没肺，是把苦难嚼碎咽下去、还能笑出声的功力。朋友最爱找你，因为再糟的事，经你一讲，都成了下酒的段子。",
      traits: ["豁达", "有趣", "打不倒"],
      hue: 20
    },
    qingzhao: {
      name: "李清照",
      source: "号易安居士 · 千古第一才女",
      quote: "何须浅碧深红色，自是花中第一流。",
      desc: "你的魂魄是易安。前半生赌书泼茶，后半生山河离乱——你都记得，一个字都不肯忘。你外表清瘦，内里却有金石之质：写得出「凄凄惨惨戚戚」，也写得出「不肯过江东」。你守护记忆的方式，就是把它写到无人能改。",
      traits: ["才气", "深情", "金石之骨"],
      hue: 320
    },
    tao: {
      name: "陶渊明",
      source: "字元亮 · 号五柳先生",
      quote: "采菊东篱下，悠然见南山。",
      desc: "你早就看穿了那场游戏，只是走得比别人干脆。不为五斗米折腰不是清高，是算明白了一笔账：拿自由换体面，亏。你要的不多——一块地，几卷书，常来往的两三人。别人以为你在退，只有你知道，你是在归。",
      traits: ["归真", "干脆", "自给自足"],
      hue: 130
    },
    wangwei: {
      name: "王维",
      source: "字摩诘 · 号摩诘居士",
      quote: "行到水穷处，坐看云起时。",
      desc: "你的魂魄是摩诘。热闹你都经历过，所以安静在你这里不是逃避，是选择。你话不多，但看得深；不争，不是没有——是都放下了。你心里有一座辋川：水穷处，云起时。任外面如何喧嚣，你自有你的空山。",
      traits: ["空静", "深看", "不争"],
      hue: 165
    }
  }
}
];
