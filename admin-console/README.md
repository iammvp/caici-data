# 猜词小程序管理后台

这是一个独立的云开发管理后台，用于维护两个集合：

- `category_list`
- `words`

支持内容：

- 分类增删改查
- 词语增删改查
- 词语按关键词检索
- 词语批量导入（textarea + 逗号分隔）
- 分类图片上传前自动裁剪到固定尺寸并转 webp 压缩
- 分类图片上传到 `images/` 目录，数据库仅保存图片文件名
- 云开发 Web SDK 直连数据库、存储、鉴权
- 微信扫码登录（`wx_open`）

## 快速运行

在仓库根目录执行：

```bash
npm run admin:dev
```

打开：

```text
http://localhost:5174
```

## 首次配置

在页面顶部填入：

- `Env ID`（已默认填成 `caici-2g1d6quzcef85d05`）
- `Client ID`（不知道可先留空）
- `Region`（默认 `ap-shanghai`）
- `微信 Provider ID`（默认 `wx_open`，通常不用改）
- `图片上传路径前缀`（默认 `images`）

配置会写入浏览器 `localStorage`，刷新后保留。

当前默认配置：

1. 保持 `Env ID` 默认值
2. `鉴权模式` 为“必须登录后操作”
3. `自动匿名登录` 为“关闭”
4. 先使用“账号密码登录”完成登录后再操作

如果没有 `Client ID`，仍可使用账号密码登录；只是无法使用微信扫码登录。
如果遇到 `permission_denied` 或跨域报错，需要再补安全域名、权限规则和登录鉴权。

## 这两个字段是什么

- `Client ID`：云开发 Web 身份认证的应用 ID。只有你要做 Web 登录、尤其是扫码登录时才需要。
- `wx_open`：云开发内置的“微信开放平台”身份源 ID，用于网页微信扫码登录。通常默认就是它。

## 登录方式说明

### 方式 A（推荐，先跑通）：账号密码登录

1. 云开发控制台 -> 身份认证 -> 用户管理
2. 新建一个用户（用户名 + 密码，或邮箱 + 密码）
3. 回到后台页面，点击“连接云开发”
4. 点击“账号密码登录”并输入账号密码
5. 右上角显示“已登录”后即可操作

### 方式 B：微信扫码登录（可选）

后台内置“微信扫码登录”按钮，流程使用：

1. `genProviderRedirectUri`
2. 微信扫码授权回调带 `code`
3. `grantProviderToken`
4. `signInWithProvider`

你需要在云开发控制台确认：

- 环境已开启对应身份源（通常 `wx_open`）
- 已创建 Web 认证应用并拿到 `Client ID`
- 当前访问域名已加入安全域名/CORS 白名单

最短登录步骤：

1. 到云开发控制台找到当前环境
2. 在身份认证或登录配置里创建一个 Web 应用
3. 拿到它的 `Client ID`
4. 把 `http://localhost:5174` 加到允许的安全域名、回调域名或 CORS 白名单
5. 回到后台页面，填入 `Client ID`
6. 点击“连接云开发”
7. 点击“微信扫码登录”
8. 扫码回跳后，右上角状态变成“已登录”即可操作

## 字段规则已实现

### category_list

- `_id` 自动生成为 `type_${id}`
- `background` 必填且必须是 hex
- `id` 必填，数字且唯一
- `title` 必填且唯一
- `image` 必填（新增时），上传前强制裁剪为 `626 x 942` 并转 webp 压缩
- `inner-image` 必填（新增时），上传前强制裁剪为 `600 x 700` 并转 webp 压缩
- `image` 和 `inner-image` 字段仅保存文件名（例如 `type_12-image-xxx.webp`）
- 图片访问地址按 `https://6361-caici-2g1d6quzcef85d05-1301791303.tcb.qcloud.la/images/<文件名>` 拼接
- `order` 默认 `999`
- `status` 默认 `inactive`，可选 `active`/`inactive`
- `tag` 默认空字符串
- 可通过 title 选择分类后查看、编辑、删除

### words

- `_id` 数据库自动生成
- `category_id` 必填，来源于 `category_list.id` 下拉选择
- 选择 `category_id` 时会联动显示对应 `title`
- `status` 默认 `active`，可选 `active`/`inactive`
- `v` 默认 `1`
- `word` 必填
- 支持关键词搜索后查看/编辑/删除
- 支持 textarea 批量导入，按英文逗号 `,`（也兼容换行和中文逗号）拆分

## 注意

- 分类列表默认最多加载 500 条，避免一次性读取过大数据。
- 词语不会在“加载数据”时全量读取，只有点击“搜索”后才会去数据库查询。
- 如果你环境里数据量远大于 500，建议后续增加分页查询。
