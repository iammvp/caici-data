// 从小行家偷词
const axios = require("axios");
const path = require('path');
const fs = require("fs-extra");
const typeMap = {
  随机: "random",
  全家欢: "6", // 已添加
  麦王争霸: "7",
  职业大全: "9",
  私密空间: "10",
  吃货达人: "11",
  我爱大明星: "12", // 已添加
  我是综艺咖: "13",
  体育迷: "14",
  动漫迷: "15",
  影视大全: "16",
  我是演技派: "17", // 已添加
  我爱大牌: "18",
  动物世界: "19",
  百科全书: "20",
  青春年华: "21",
};
const cookie =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MTUzNzgyNzAsImRhdGEiOnsiaWQiOjE1NzUsIm9wZW5pZCI6Im9zNTRfNWFjSVJBUHQzNjlmV1FzWVFCaWNHc1kiLCJuaWNrbmFtZSI6IuadjuWvhiIsImdlbmRlciI6MSwiY2l0eSI6IlRpYW5tZW4iLCJwcm92aW5jZSI6Ikh1YmVpIiwibGFuZ3VhZ2UiOiJ6aF9DTiIsImF2YXRhciI6Imh0dHBzOi8vd3gucWxvZ28uY24vbW1vcGVuL3ZpXzMyL2trZzRXVkZwbGdNR3pOaWJHT3ZjT1g5cjJMaWMyYlBNVkVIT2E5VFVnVFl3ZVFJY1RvRnZCYzZFMGF3UzlsV0tOTWFFV3VCRTZHeGhrS0lkRG5tRGx1VncvMTMyIiwiaXAiOiIxMC4wLjEuMTM0Iiwic3RhcnMiOiIxNDUiLCJjcmVhdGVkQXQiOiIyMDIwLTAzLTMwVDE1OjQwOjE1LjAwMFoiLCJ1cGRhdGVkQXQiOiIyMDIxLTAyLTE1VDEzOjAxOjA3LjAwMFoifSwiaWF0IjoxNjE1MjkxODcwfQ.nOFzX-gDTodaK_gRoirpjO10xuQCVV5jWGH43vBaKe4"; // 登录cookie
// const type = "随机"; // 类型
Object.keys(typeMap).forEach((key) => {
  const result = new Set();
  sendRequest(result, key)
    .then((res) => {
      console.log(key + "类型的总个数" + res.size);
      fs.writeFile(path.join(__dirname, `./file/xiaohangjia/${key}.txt`), [...res].join(','), (err) => {
        if(err) {
          console.log('写入失败');
        }
      })
    })
    .catch((err) => console.log(err));
});
function sendRequest(set, key) {
  let sameCount = 0; // 新拉一次没有拉倒新数据的次数, 当连续次数大于5的时候认为已经全部拉取了
  return new Promise((resolve, reject) => {
    function send() {
      axios
        .get(`https://api-caici.xhangjia.com/v1/user/words/${typeMap[key]}`, {
          headers: {
            authorization: cookie,
          },
        })
        .then((res) => {
          if (res.data && res.data.code === 200) {
            let preSize = set.size;
            let realData = key === "随机" ? res.data.data[0] : res.data.data; // 接口返回数据可能不一致
            realData.forEach((d) => {
              set.add(d.name);
            });
            let newSize = set.size;
            // console.log(preSize, newSize);
            if (sameCount === 10) {
              resolve(set);
            } else {
              if (newSize === preSize) {
                sameCount++;
              } else {
                sameCount = 0;
              }
              send();
            }
          } else {
            reject(res);
          }
        })
        .catch((err) => {
          reject(err);
        });
    }
    send();
  });
}
