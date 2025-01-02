"use strict";
const fs = require("fs-extra");
const { networkInterfaces } = require("os");
const inquirer = require("inquirer");
const { globSync } = require("glob");
const LZString = require("lz-string");
const lodashSet = require("lodash.set");
const raw = require("./data.json");
const infoListData = require("./info-list.json");
const typeListData = infoListData.typeList;
const wordListData = require("./word-list.json");
const path = require("path");
const sharp = require("sharp");
const imagemin = require("imagemin");
const imageminJpegtran = require("imagemin-jpegtran");
const { default: imageminPngquant } = require("imagemin-pngquant");
const data = raw.data;
const buildEnv = process.env.ENV;
const localIP = networkInterfaces()["en0"][0]["address"];
const localServer = `http://${localIP}:3000`;
const githubServer = `https://fastly.jsdelivr.net/gh/iammvp/caici-data@latest`;
const version = "v2";
for (let i = 0; i < typeListData.length; i++) {
  const info = typeListData[i];
  console.log(
    `${info.title}: ${wordListData[i].length} 个词汇, id: ${info.id}`,
  );
}

const firstPrompt = {
  type: "list",
  name: "first",
  message: "想做什么?",
  choices: [
    {
      name: "增加词汇",
      value: "add",
    },
    {
      name: "删除词汇",
      value: "delete",
    },
    {
      name: "压缩json文件",
      value: "compress",
    },
    {
      name: "压缩图片文件",
      value: "compress-image",
    },
    {
      name: "导出词汇",
      value: "export",
    },
    {
      name: "复制信息到项目",
      value: "copy",
    },
    {
      name: "退出",
      value: "exit",
    },
  ],
};

const typeSelectPrompt = {
  type: "list",
  choices: () => {
    let temp = [];
    for (let i = 1; i < wordListData.length; i++) {
      temp.push({
        value: i,
        name: data[i].title,
      });
    }
    return temp;
  },
};
const confirmPrompt = {
  type: "confirm",
  default: false,
};

inquirer.prompt(firstPrompt).then((answer) => {
  if (answer.first === "compress") {
    // 压缩文件
    generateFile();
  } else if (answer.first === "add") {
    inquirer
      .prompt({ ...typeSelectPrompt, name: "add", message: "增加哪个类型?" })
      .then((addPromptAnser) => {
        addWords(addPromptAnser.add);
      });
  } else if (answer.first === "delete") {
    fs.readFile("./files/delete.txt", "utf8", (err, content) => {
      if (err) {
        console.log("读取删除词汇失败");
      } else {
        const str = content.trim();
        if (str === "") {
          console.log("删除词汇为空");
        } else {
          console.log(str);
          inquirer
            .prompt({
              ...confirmPrompt,
              name: "deleteConfirm",
              message: `确定删除${str.substr(0, 20) + "..."} 等词语?`,
            })
            .then((confirmAnswer) => {
              if (confirmAnswer.deleteConfirm === true) {
                const tempArray = str.split(" ");
                tempArray.forEach((v) => {
                  deleteWord(v);
                });
                generateFile();
                wipeUsedFile("./files/delete.txt");
              }
            });
        }
      }
    });
  } else if (answer.first === "compress-image") {
    (async () => {
      // const name = "guide-slide1";
      // const frames = 30;
      // const width = 18000;
      // const height = 444;
      // const per = width / frames;
      // const promiseArray = globSync(`images/min/${name}.{jpg,png}`).map((v) => {
      //   for (let i = 0; i < frames; i++) {
      //     sharp(v)
      //       .extract({ left: per * i, top: 0, width: per, height: height })
      //       .webp({ quality: 100 })
      //       .toFile(
      //         path.join("images/webp", `${name}_${i + 1}.webp`),
      //         function (err) {
      //           console.log(err);
      //         },
      //       );
      //   }
      // });
      const promiseArray = globSync("images/min/*.{jpg,png}")
        .filter((v) => !v.includes("guide"))
        .map((v) => {
          const name = path.basename(v, path.extname(v));
          const filesInfo = {
            from: v,
            to: path.join("images/webp", `${name}.webp`),
          };
          return sharp(filesInfo.from)
            .webp({ quality: 10, alphaQuality: 10 })
            .toFile(filesInfo.to);
        });
      Promise.all(promiseArray).then((_) => {
        console.log("压缩完成");
      });
    })();
  } else if (answer.first === "exit") {
    process.exit();
  } else if (answer.first === "export") {
    Promise.all(
      wordListData.map((d, index) =>
        writeFilePromise(
          `./files/current/${typeListData[index].title}.txt`,
          getRawWords(d),
        ),
      ),
    ).then((res) => {
      console.log("写入完成");
    });
  } else if (answer.first === "copy") {
    fs.cp(
      "./compressData",
      "../caici/src/data/",
      { recursive: true },
      (err) => {
        console.log("done");
      },
    );
  }
});

function generateFile() {
  fs.writeFileSync("./word-list.json", JSON.stringify(wordListData, null, 2));

  // const devRaw = JSON.stringify(raw).replace(
  //   // /npm\/caici-data[^\/]*/g,
  //   // `gh/iammvp/caici-data@${gitReleaseVersion}`
  //   /https:\/\/fastly.jsdelivr.net\/npm\/caici-data[^\/]*/g,
  //   `${buildEnv === "dev" ? localServer : githubServer}`,
  // );
  transLocalImageToBase64().then(() => {
    fs.writeFile(
      "./compressData/infoList.txt",
      LZString.compressToBase64(JSON.stringify(infoListData)),
      (err) => {
        if (err) {
          console.log("写入压缩文件失败");
        }
      },
    );
    fs.writeFile(
      "./compressData/wordList.txt",
      LZString.compressToBase64(JSON.stringify(wordListData)),
      (err) => {
        if (err) {
          console.log("写入压缩文件失败");
        }
      },
    );
  });
}

function transLocalImageToBase64() {
  const localImageInfo = getAllLocalImage();
  const arrayPromise = localImageInfo.map((v) => {
    return new Promise((resolve, reject) => {
      fs.readFile(v.filePath, (error, data) => {
        const ext = path.extname(v.filePath);
        const imageBase64 =
          `data:image/${ext};base64,` + data.toString("base64");
        lodashSet(infoListData, v.keyPath, imageBase64);
        resolve();
      });
    });
  });
  return new Promise((resolve) => {
    Promise.all(arrayPromise).then(() => {
      return resolve();
    });
  });
}

function getAllLocalImage() {
  let result = [];
  function travel(prefix, data) {
    for (let key in data) {
      if (typeof data[key] === "object" && data[key] !== null) {
        travel(prefix === "" ? key : `${prefix}['${key}']`, data[key]);
      } else {
        const value = data[key];
        if (
          typeof value === "string" &&
          value.includes("./images/") &&
          !value.includes("https://")
        ) {
          result.push({
            keyPath: prefix === "" ? key : `${prefix}['${key}']`,
            filePath: value,
          });
        }
      }
    }
  }
  travel("", infoListData);
  return result;
}
function addWords(index) {
  fs.readFile("./files/add.txt", "utf8", (err, content) => {
    if (err) {
      console.log("读取add文件失败");
    } else {
      const str = content.trim();
      if (str === "") {
        console.log("add文件为空");
      } else {
        inquirer
          .prompt({
            ...confirmPrompt,
            name: "addConfirm",
            message: `确定向 ${typeListData[index].title} 增加 ${
              str.substr(0, 20) + "..."
            } 等词语?`,
          })
          .then((confirmAnswer) => {
            if (confirmAnswer.addConfirm === true) {
              let indicator = " ";
              if (str.includes(",")) {
                indicator = ",";
              } else if (str.includes("。")) {
                indicator = "。";
              }
              const tempArray = str.split(indicator);
              tempArray.forEach((v) => {
                const trimV = v.trim();
                if (trimV.length > 0) {
                  addWordToType(index, trimV); // 增加到对应类型
                }
              });
              generateFile();
              wipeUsedFile("./files/add.txt");
            }
          });
      }
    }
  });
}

function deleteWord(word) {
  wordListData.forEach((v) => {
    const index = v.words.findIndex(
      (w) => w.word.toLowerCase().trim() === word.toLowerCase().trim(),
    );
    if (index !== -1) {
      v.words.splice(index, 1);
      console.log(`${v.title}中找到词汇 ${word}, 删除成功`);
    }
  });
}

function savePrevData() {
  return new Promise((resolve, reject) => {
    fs.writeFile(
      "./files/data.prev.json",
      JSON.stringify(raw, null, 2),
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
}

function addWordToType(index, word) {
  if (
    wordListData[index].words.findIndex(
      (w) => w.word.toLowerCase() === word.toLowerCase(),
    ) === -1
  ) {
    wordListData[index].words.push({
      word,
      l: strlen(word),
    });
  } else {
    console.log(`${word}在${data[index].title}中重复,已经跳过`);
  }
}

function wipeUsedFile(path) {
  fs.writeFile(path, "", (err) => {
    if (err) {
      console.log("清理使用文件出错");
    }
  });
}
function strlen(str) {
  var len = 0;
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255 || str.charCodeAt(i) < 0) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
}

function writeFilePromise(path, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, content, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function getRawWords(arr) {
  return arr.reduce((str, wordObj) => str + " " + wordObj.word, "");
}
