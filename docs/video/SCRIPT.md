# Voiceover script

First person, spoken. One block per scene; each block is recorded as one ElevenLabs take
(`eleven_v4`, voice Will `bIHbv24MWmeRgasZH58o`), so captions come from the take's own
character alignment. Screens named in brackets are real captures from the live app.

## s1 problem  [group-chat requirements]
我是 Calder，在读学生，这个是我一个人做的。约朋友吃饭，其实最累的不是吃，是在群里来回商量。有人吃素，有人不吃海鲜，有人预算紧，还有人花生过敏。到了店里，点菜又得再来一轮。

## s2 who  [1/3 谁来吃, sample party filled in]
所以我做了 MeetSpot 饭局 Agent。第一步，谁来吃。每个人说一句自己的要求，大白话就行。

## s3 parse  [2/3 去哪吃, 我是这样理解每个人的要求的]
第二步，去哪吃。它先把每个人的话整理成条件，列出来，大家对一眼。

## s4 veto  [crossed-out restaurants with reasons, then the remaining ones]
然后在大家中间找附近的店，不合适的直接划掉。你看，每一家都写着是谁的哪条要求。比如小张吃素，这家的招牌菜是烤鸭。留下来的店，我标的是按品类初筛，还没核实。

## s5 menu  [3/3 点什么, 示例菜单 photo and the parsed dish list]
第三步，点什么。到店拍一下菜单，它只读照片上真有的菜和价格，读错了直接改就行。没在店里，也能用一张示例菜单试试。

## s6 slip  [final 点菜单]
最后出一张点菜单。每道菜写着谁能吃，总价按菜单价格算，人均六十四，没超预算。

## s7 rules  [点菜单 footer: 过敏原请向店员确认]
这里模型只干两件事，听懂人话，读菜单。规则都是代码一条一条查的，所以每次划掉，都有理由。过敏它只做提示，点菜单上一直写着，过敏原请向店员确认。

## s8 close  [title card + link]
下次约饭，把链接丢进群里，每人说一句就行。
