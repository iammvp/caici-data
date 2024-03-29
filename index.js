"use strict";
const fs = require("fs-extra");
const { networkInterfaces } = require('os');
const inquirer = require("inquirer");
const imagemin = require("imagemin");
const imageminJpegtran = require("imagemin-jpegtran");
const imageminPngquant = require("imagemin-pngquant");
const raw = require("./data.json");
const data = raw.data;
const buildEnv = process.env.ENV;
const localIP = networkInterfaces()['en0'][0]['address']; 
const localServer = `http://${localIP}:3000`;
const githubServer = `https://cdn.jsdelivr.net/gh/iammvp/caici-data@latest`;
const version = "v2";
console.log(`当前词汇量: ${data[0].words.length}个, 类型: ${data.length}种`);
for (let i = 0; i < data.length; i++) {
  console.log(
    `${data[i].title}: ${data[i].words.length} 个词汇, id: ${data[i].id}`
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
      name: "退出",
      value: "exit",
    },
  ],
};

const typeSelectPrompt = {
  type: "list",
  choices: () => {
    let temp = [];
    for (let i = 1; i < data.length; i++) {
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
                savePrevData().then(() => {
                  const tempArray = str.split(" ");
                  tempArray.forEach((v) => {
                    deleteWord(v);
                  });
                  generateFile();
                  wipeUsedFile("./files/delete.txt");
                });
              }
            });
        }
      }
    });
  } else if (answer.first === "compress-image") {
    (async () => {
      const files = await imagemin(["images/to-compress/*.{jpg,png}"], {
        destination: "images/min",
        plugins: [
          imageminJpegtran(),
          imageminPngquant({
            quality: [0.6, 0.8],
          }),
        ],
      });
      fs.readdir("images/to-compress", (err, files) => {
        files.forEach((file) => {
          fs.rename(
            `images/to-compress/${file}`,
            `images/original/${file}`,
            (err) => {
              if (err) {
                console.log(err);
              }
            }
          );
        });
      });
    })();
  } else if (answer.first === "exit") {
    process.exit();
  } else if (answer.first === "export") {
    Promise.all(
      data.map((d) =>
        writeFilePromise(`./files/current/${d.title}.txt`, getRawWords(d.words))
      )
    ).then((res) => {
      console.log("写入完成");
    });
  }
});

function generateFile() {
  fs.writeFile("./data.json", JSON.stringify(raw, null, 2), (err) => {
    if (err) {
      console.log("写入文件失败");
    }
    console.log("写入完成");
  });
  fs.writeFile("./data.min.json", JSON.stringify(raw), (err) => {
    if (err) {
      console.log("写入压缩文件失败");
    }
    console.log("写入压缩完成");
  });
  const devRaw = JSON.stringify(raw).replace(
    // /npm\/caici-data[^\/]*/g,
    // `gh/iammvp/caici-data@${gitReleaseVersion}`
    /https:\/\/cdn.jsdelivr.net\/npm\/caici-data[^\/]*/g,
    `${ buildEnv === 'dev' ? localServer : githubServer}`
  );
  const devData = JSON.parse(devRaw);
  fs.writeFile("./data.dev.json", devRaw, (err) => {
    if (err) {
      console.log("写入dev文件失败");
    }
    console.log("写入dev完成");
  });
  let wordList = [],
    devWordList = [],
    typeList = [],
    devTypeList = [];
  // 剥离正式数据
  data.forEach((v) => {
    let { words, ...type } = v;
    wordList.push(words);
    typeList.push(type);
  });
  // 剥离dev数据
  devData.data.forEach((v) => {
    let { words, ...type } = v;
    devWordList.push(words);
    devTypeList.push(type);
  });
  // 写入正式数据v2
  fs.writeFile(
    `./${version}/type-list.json`,
    JSON.stringify({ typeList, sort: raw.sort, file: raw.file }),
    (err) => {
      if (err) {
        console.log(err);
      }
    }
  );
  fs.writeFile(
    `./${version}/word-list.json`,
    JSON.stringify(wordList),
    (err) => {
      if (err) {
        console.log(err);
      }
    }
  );
  // 写入测试数据v2
  fs.writeFile(
    `./${version}/dev/type-list.json`,
    JSON.stringify({
      typeList: devTypeList,
      sort: devData.sort,
      file: devData.file,
    }),
    (err) => {
      if (err) {
        console.log(err);
      }
    }
  );
  fs.writeFile(
    `./${version}/dev/word-list.json`,
    JSON.stringify(devWordList),
    (err) => {
      if (err) {
        console.log(err);
      }
    }
  );
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
            message: `确定向 ${data[index].title} 增加 ${
              str.substr(0, 20) + "..."
            } 等词语?`,
          })
          .then((confirmAnswer) => {
            if (confirmAnswer.addConfirm === true) {
              savePrevData().then(() => {
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
                    if (data[index].isOnly !== true) {
                      // 如果不是专有词汇, 增加到随机词汇里面去
                      addWordToType(0, trimV); // 增加到随机类型
                    }
                  }
                });
                generateFile();
                wipeUsedFile("./files/add.txt");
              });
            }
          });
      }
    }
  });
}

function deleteWord(word) {
  data.forEach((v) => {
    const index = v.words.findIndex(
      (w) => w.word.toLowerCase().trim() === word.toLowerCase().trim()
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
      }
    );
  });
}

function addWordToType(index, word) {
  if (
    data[index].words.findIndex(
      (w) => w.word.toLowerCase() === word.toLowerCase()
    ) === -1
  ) {
    data[index].words.push({
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
