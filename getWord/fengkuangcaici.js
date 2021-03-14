// 从疯狂猜词抓词

const axios = require("axios");
const qs = require("qs");
const path = require("path");
const fs = require("fs-extra");
const types = [
  "无节操",
  "K歌之王",
  "我是吃货", // 已添加
  "电影达人",
  "合家欢",
  "我是戏精",
  "亲子时刻",
  "八零九零",
  "私密情侣",
  "青葱校园",
  "大明星",
  "二次元",
  "体育迷",
  "女人我最大",
  "七夕鹊桥仙",
  "成语猜猜猜",
  "我是学霸",
  "动物世界",
  "历史那些事",
  "品牌控",
  "追剧迷",
  "武林往事",
  "超级英雄",
];
let allWords = [];
Promise.all(
  types.map((w) => {
    return axios({
      url: "http://www.yudiangame.cn/show/getCi",
      method: "post",
      data: qs.stringify({
        name: w,
      }),
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });
  })
).then((arrays) => {
  for (let i = 0; i < types.length; i++) {
    const words = Object.keys(arrays[i].data.data);
    console.log(types[i] + "类型的总个数" + words.length);
    fs.writeFile(
      path.join(__dirname, `./file/fengkuangcaici/${types[i]}.txt`),
      [...words].join(","),
      (err) => {
        if (err) {
          console.log("写入失败");
        }
      }
    );
    allWords = [...allWords, ...words];
  }

  console.log("全部类型的总个数" + allWords.length);
  fs.writeFile(
    path.join(__dirname, `./file/fengkuangcaici/全部.txt`),
    [...allWords].join(","),
    (err) => {
      if (err) {
        console.log("写入失败");
      }
    }
  );
});
