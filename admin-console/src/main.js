import cloudbase from "@cloudbase/js-sdk";

const STORAGE_KEY = "caici-admin-config-v1";
const CATEGORY_COLLECTION = "category_list";
const WORD_COLLECTION = "words";
const MAX_QUERY_ROWS = 500;
const CATEGORY_IMAGE_SIZE = { width: 626, height: 942 };
const CATEGORY_INNER_IMAGE_SIZE = { width: 600, height: 700 };
const DEFAULT_STORAGE_PREFIX = "images";
const DEFAULT_IMAGE_BASE_URL =
  "https://6361-caici-2g1d6quzcef85d05-1301791303.tcb.qcloud.la/images";
const DEFAULT_STORAGE_BUCKET_ID = extractBucketIdFromPublicUrl(DEFAULT_IMAGE_BASE_URL);

const state = {
  config: {
    envId: "caici-2g1d6quzcef85d05",
    clientId: "",
    region: "ap-shanghai",
    providerId: "wx_open",
    storagePrefix: DEFAULT_STORAGE_PREFIX,
    authMode: "required",
    autoAnonymous: false,
    note: "",
  },
  app: null,
  db: null,
  auth: null,
  storage: null,
  loginState: null,
  categories: [],
  words: [],
  hasSearchedWords: false,
  currentCategoryId: "",
  currentWordId: "",
  signedUrlCache: new Map(),
};

const el = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  loadConfigToForm();
  switchTab("categories");
  resetCategoryForm();
  resetWordForm();
});

function cacheElements() {
  const ids = [
    "authState",
    "btnConnect",
    "btnPasswordLogin",
    "btnWechatLogin",
    "btnLogout",
    "btnSaveConfig",
    "btnLoadData",
    "cfgEnvId",
    "cfgClientId",
    "cfgRegion",
    "cfgProviderId",
    "cfgStoragePrefix",
    "cfgAuthMode",
    "cfgAutoAnonymous",
    "cfgNote",
    "tabBtnCategories",
    "tabBtnWords",
    "tabCategories",
    "tabWords",
    "categoryPicker",
    "categorySummary",
    "btnNewCategory",
    "btnDeleteCategory",
    "categoryForm",
    "catDocId",
    "catId",
    "catTitle",
    "catBackground",
    "catBackgroundColor",
    "catOrder",
    "catStatus",
    "catTag",
    "catImageFile",
    "catInnerImageFile",
    "catImagePreview",
    "catInnerImagePreview",
    "btnSaveCategory",
    "wordSearchKeyword",
    "wordSearchCategory",
    "btnSearchWord",
    "btnResetWordSearch",
    "wordSearchStats",
    "wordList",
    "wordForm",
    "wordDocId",
    "wordCategoryId",
    "wordCategoryTitle",
    "wordStatus",
    "wordV",
    "wordText",
    "btnSaveWord",
    "btnNewWord",
    "btnDeleteWord",
    "batchCategoryId",
    "batchStatus",
    "batchV",
    "batchWordsText",
    "btnBatchImport",
    "batchImportResult",
    "toast",
  ];

  ids.forEach((id) => {
    el[id] = document.getElementById(id);
  });
}

function bindEvents() {
  el.btnSaveConfig.addEventListener("click", onSaveConfig);
  el.btnConnect.addEventListener("click", onConnect);
  el.btnPasswordLogin.addEventListener("click", onPasswordLogin);
  el.btnWechatLogin.addEventListener("click", onWechatLogin);
  el.btnLogout.addEventListener("click", onLogout);
  el.btnLoadData.addEventListener("click", onLoadData);

  el.tabBtnCategories.addEventListener("click", () => switchTab("categories"));
  el.tabBtnWords.addEventListener("click", () => switchTab("words"));

  el.catId.addEventListener("input", updateCategoryDocIdPreview);
  el.catBackground.addEventListener("input", syncBackgroundTextToColor);
  el.catBackgroundColor.addEventListener("input", syncBackgroundColorToText);
  el.catImageFile.addEventListener("change", () => previewLocalCategoryImage("image"));
  el.catInnerImageFile.addEventListener("change", () =>
    previewLocalCategoryImage("inner-image"),
  );
  el.categoryPicker.addEventListener("change", onCategoryPick);
  el.btnNewCategory.addEventListener("click", () => resetCategoryForm());
  el.btnDeleteCategory.addEventListener("click", onDeleteCategory);
  el.categoryForm.addEventListener("submit", onSaveCategory);

  el.btnSearchWord.addEventListener("click", onSearchWords);
  el.btnResetWordSearch.addEventListener("click", onResetWordSearch);
  el.wordSearchKeyword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSearchWords();
    }
  });
  el.wordCategoryId.addEventListener("change", syncWordCategoryTitle);
  el.btnNewWord.addEventListener("click", () => resetWordForm());
  el.btnDeleteWord.addEventListener("click", onDeleteWord);
  el.wordForm.addEventListener("submit", onSaveWord);
  el.btnBatchImport.addEventListener("click", onBatchImportWords);
}

function switchTab(tab) {
  const isCategory = tab === "categories";
  el.tabBtnCategories.classList.toggle("active", isCategory);
  el.tabBtnWords.classList.toggle("active", !isCategory);
  el.tabCategories.classList.toggle("active", isCategory);
  el.tabWords.classList.toggle("active", !isCategory);
}

function readConfigFromForm() {
  return {
    envId: (el.cfgEnvId.value || "").trim(),
    clientId: (el.cfgClientId.value || "").trim(),
    region: (el.cfgRegion.value || "ap-shanghai").trim(),
    providerId: (el.cfgProviderId.value || "wx_open").trim(),
    storagePrefix: DEFAULT_STORAGE_PREFIX,
    authMode: el.cfgAuthMode.value === "optional" ? "optional" : "required",
    autoAnonymous: el.cfgAutoAnonymous.value === "true",
    note: (el.cfgNote.value || "").trim(),
  };
}

function writeConfigToForm(config) {
  el.cfgEnvId.value = config.envId || "";
  el.cfgClientId.value = config.clientId || "";
  el.cfgRegion.value = config.region || "ap-shanghai";
  el.cfgProviderId.value = config.providerId || "wx_open";
  el.cfgStoragePrefix.value = DEFAULT_STORAGE_PREFIX;
  el.cfgAuthMode.value = config.authMode === "optional" ? "optional" : "required";
  el.cfgAutoAnonymous.value = String(Boolean(config.autoAnonymous));
  el.cfgNote.value = config.note || "";
}

function loadConfigToForm() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      writeConfigToForm(state.config);
      return;
    }
    const saved = JSON.parse(raw);
    const savedAuthMode = saved.authMode === "optional" ? "required" : saved.authMode;
    const savedAutoAnonymous =
      typeof saved.autoAnonymous === "boolean"
        ? saved.autoAnonymous
        : state.config.autoAnonymous;
    state.config = {
      ...state.config,
      ...saved,
      envId: saved.envId || state.config.envId,
      clientId: saved.clientId || state.config.clientId,
      region: saved.region || state.config.region,
      providerId: saved.providerId || state.config.providerId,
      storagePrefix: DEFAULT_STORAGE_PREFIX,
      authMode: savedAuthMode || state.config.authMode,
      autoAnonymous:
        (savedAuthMode || state.config.authMode) === "required"
          ? false
          : savedAutoAnonymous,
      note: saved.note || state.config.note,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config));
    writeConfigToForm(state.config);
  } catch (error) {
    writeConfigToForm(state.config);
    toast(`读取配置失败: ${formatError(error)}`, "error");
  }
}

function validateConfig(config) {
  if (!config.envId) {
    throw new Error("Env ID 必填");
  }

  if (config.authMode === "required") {
    config.autoAnonymous = false;
  }

  config.storagePrefix = DEFAULT_STORAGE_PREFIX;
}

function saveConfig() {
  const config = readConfigFromForm();
  validateConfig(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  state.config = config;
  return config;
}

function onSaveConfig() {
  try {
    saveConfig();
    toast("配置已保存", "success");
  } catch (error) {
    toast(formatError(error), "error");
  }
}

async function onConnect() {
  try {
    const config = saveConfig();
    setAuthStateText("连接中...");

    state.app = cloudbase.init({
      env: config.envId,
      clientId: config.clientId || undefined,
      region: config.region || undefined,
    });
    state.db = state.app.database();
    state.auth = state.app.auth();
    state.storage = DEFAULT_STORAGE_BUCKET_ID
      ? state.app.storage.from(DEFAULT_STORAGE_BUCKET_ID)
      : state.app.storage.from();

    await completeWechatAuthCallback();
    await refreshLoginState();

    if (
      config.authMode === "optional" &&
      config.autoAnonymous &&
      !isLoggedIn() &&
      state.auth
    ) {
      try {
        await state.auth.signInAnonymously();
        await refreshLoginState();
      } catch (anonymousError) {
        toast(
          `匿名登录未开启，已继续使用未登录模式: ${formatError(anonymousError)}`,
          "info",
        );
      }
    }

    updateOperateButtons();
    if (config.authMode === "required" && !isLoggedIn()) {
      toast("云开发已连接，请先“账号密码登录”或“微信扫码登录”后再进行增删改查", "info");
    } else {
      toast("云开发连接成功", "success");
    }
  } catch (error) {
    toast(`连接失败: ${formatError(error)}`, "error");
    setAuthStateText("连接失败");
  }
}

async function completeWechatAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const providerCode = params.get("code");
  const callbackState = params.get("state");

  if (!providerCode || !callbackState || !callbackState.startsWith("caici_admin_wx_")) {
    return;
  }

  const expectedState = sessionStorage.getItem("caici_admin_wx_state");
  if (expectedState && callbackState !== expectedState) {
    throw new Error("微信登录 state 校验失败");
  }

  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  const grantRes = await state.auth.grantProviderToken({
    provider_id: state.config.providerId || "wx_open",
    provider_redirect_uri: redirectUri,
    provider_code: providerCode,
  });

  if (!grantRes || !grantRes.provider_token) {
    throw new Error("未拿到 provider_token");
  }

  await state.auth.signInWithProvider({
    provider_token: grantRes.provider_token,
  });

  sessionStorage.removeItem("caici_admin_wx_state");
  window.history.replaceState({}, document.title, redirectUri);
  toast("微信扫码登录成功", "success");
}

async function refreshLoginState() {
  if (!state.auth) {
    state.loginState = null;
    setAuthStateText("未连接");
    updateOperateButtons();
    return;
  }

  const loginState = await state.auth.getLoginState();
  state.loginState = loginState;

  if (isLoggedIn()) {
    const user = getCurrentUser();
    const name = user?.name || user?.username || user?.uid || user?.sub || "已登录用户";
    setAuthStateText(`已登录: ${name}`);
  } else if (state.config.authMode === "required") {
    setAuthStateText(
      state.config.clientId
        ? "未登录（可账号密码登录或微信扫码）"
        : "未登录（可账号密码登录）",
    );
  } else {
    setAuthStateText("未登录（可匿名）");
  }

  updateOperateButtons();
}

function isLoggedIn() {
  if (!state.loginState) {
    return false;
  }

  const user = getCurrentUser();
  return Boolean(user);
}

function getCurrentUser() {
  if (!state.loginState) {
    return null;
  }

  if (state.loginState.userLoginState?.user) {
    return state.loginState.userLoginState.user;
  }

  if (state.loginState.user) {
    return state.loginState.user;
  }

  return null;
}

function setAuthStateText(text) {
  el.authState.textContent = text;
}

function updateOperateButtons() {
  const connected = Boolean(state.db && state.auth && state.storage);
  const canOperate =
    connected && (state.config.authMode === "optional" || isLoggedIn());
  const canWechatLogin =
    connected && Boolean(state.config.clientId) && Boolean(state.config.providerId);
  const canPasswordLogin = !isLoggedIn();

  el.btnPasswordLogin.disabled = !canPasswordLogin;
  el.btnWechatLogin.disabled = !canWechatLogin;
  el.btnLogout.disabled = !connected || !isLoggedIn();
  el.btnLoadData.disabled = !canOperate;

  el.btnSaveCategory.disabled = !canOperate;
  el.btnDeleteCategory.disabled = !canOperate || !state.currentCategoryId;

  el.btnSearchWord.disabled = !canOperate;
  el.btnSaveWord.disabled = !canOperate;
  el.btnDeleteWord.disabled = !canOperate || !state.currentWordId;
  el.btnBatchImport.disabled = !canOperate;
}

async function onWechatLogin() {
  try {
    ensureConnected();

    if (!state.config.clientId) {
      throw new Error(
        "微信扫码登录需要 Client ID。当前可以先用“账号密码登录”；若要扫码登录，再到控制台创建 Web 应用并填写 Client ID。",
      );
    }
    if (!state.config.providerId) {
      throw new Error("缺少微信 Provider ID，通常填写 wx_open");
    }

    const loginState = await state.auth.getLoginState();
    if (loginState && getCurrentUser()) {
      toast("当前已经登录", "success");
      return;
    }

    const loginStateId = `caici_admin_wx_${Date.now()}`;
    sessionStorage.setItem("caici_admin_wx_state", loginStateId);

    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const res = await state.auth.genProviderRedirectUri({
      provider_id: state.config.providerId || "wx_open",
      provider_redirect_uri: redirectUri,
      state: loginStateId,
    });

    if (!res || !res.uri) {
      throw new Error("未生成微信登录链接");
    }

    window.location.href = res.uri;
  } catch (error) {
    toast(`扫码登录失败: ${formatError(error)}`, "error");
  }
}

async function onPasswordLogin() {
  try {
    if (isLoggedIn()) {
      toast("当前已经登录", "success");
      return;
    }

    const accountInput = window.prompt(
      "请输入账号（用户名或邮箱）\n如未创建账号，请先到云开发控制台 -> 身份认证 -> 用户管理 新建用户",
    );
    if (accountInput === null) {
      return;
    }

    const passwordInput = window.prompt("请输入密码");
    if (passwordInput === null) {
      return;
    }

    const account = String(accountInput || "").trim();
    const password = String(passwordInput || "");

    if (!account || !password) {
      throw new Error("账号和密码都必填");
    }

    if (!state.db || !state.auth || !state.storage) {
      await onConnect();
    }
    ensureConnected();

    const payload = {
      password,
      ...(account.includes("@") ? { email: account } : { username: account }),
    };

    const signInRes = await state.auth.signInWithPassword(payload);
    if (signInRes?.error) {
      throw new Error(signInRes.error.message || signInRes.error.code || "账号登录失败");
    }

    await refreshLoginState();
    toast("账号密码登录成功", "success");
  } catch (error) {
    toast(`账号登录失败: ${formatError(error)}`, "error");
  }
}

async function onLogout() {
  try {
    ensureConnected();
    await state.auth.signOut();
    await refreshLoginState();
    toast("已退出登录", "success");
  } catch (error) {
    toast(`退出失败: ${formatError(error)}`, "error");
  }
}

async function onLoadData() {
  try {
    ensureCanOperate();
    await loadCategories();
    clearWordResults("请先输入关键词或选择分类后搜索");
    toast("分类数据已加载", "success");
  } catch (error) {
    toast(`加载失败: ${formatError(error)}`, "error");
  }
}

function ensureConnected() {
  if (!state.db || !state.auth || !state.storage) {
    throw new Error("请先连接云开发");
  }
}

function ensureCanOperate() {
  ensureConnected();

  if (state.config.authMode === "required" && !isLoggedIn()) {
    throw new Error("当前要求登录，请先微信扫码登录");
  }
}

async function loadCategories() {
  const records = await queryAll(
    CATEGORY_COLLECTION,
    {},
    { orderByField: "order", orderByOrder: "asc", maxRows: MAX_QUERY_ROWS },
  );

  records.sort((a, b) => {
    const orderDiff = Number(a.order || 999) - Number(b.order || 999);
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return Number(a.id || 0) - Number(b.id || 0);
  });

  state.categories = records;
  renderCategoryPicker();
  renderCategoryOptionsForWordForms();
}

function renderCategoryPicker() {
  const current = state.currentCategoryId;
  el.categoryPicker.innerHTML = '<option value="">请选择</option>';

  state.categories.forEach((item) => {
    const option = document.createElement("option");
    option.value = item._id;
    option.textContent = `${item.title} (id:${item.id})`;
    el.categoryPicker.appendChild(option);
  });

  if (current && state.categories.some((item) => item._id === current)) {
    el.categoryPicker.value = current;
  } else {
    el.categoryPicker.value = "";
  }
}

function renderCategoryOptionsForWordForms() {
  const options = state.categories.map((item) => ({
    value: String(item.id),
    label: `${item.title} (id:${item.id})`,
  }));

  fillSelect(el.wordCategoryId, options, "请选择", el.wordCategoryId.value);
  fillSelect(el.batchCategoryId, options, "请选择", el.batchCategoryId.value);
  fillSelect(el.wordSearchCategory, options, "全部分类", el.wordSearchCategory.value);

  syncWordCategoryTitle();
}

function fillSelect(selectEl, options, defaultLabel, keepValue) {
  const previous = keepValue || "";
  selectEl.innerHTML = "";

  const first = document.createElement("option");
  first.value = "";
  first.textContent = defaultLabel;
  selectEl.appendChild(first);

  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    selectEl.appendChild(option);
  });

  if (previous && options.some((item) => item.value === previous)) {
    selectEl.value = previous;
  } else {
    selectEl.value = "";
  }
}

function onCategoryPick() {
  const docId = el.categoryPicker.value;
  if (!docId) {
    resetCategoryForm();
    return;
  }

  const category = state.categories.find((item) => item._id === docId);
  if (!category) {
    resetCategoryForm();
    return;
  }

  fillCategoryForm(category);
}

async function fillCategoryForm(category) {
  state.currentCategoryId = category._id;

  el.catDocId.value = category._id || "";
  el.catId.value = Number.isFinite(Number(category.id)) ? String(category.id) : "";
  el.catTitle.value = category.title || "";
  el.catBackground.value = category.background || "";
  el.catOrder.value = Number.isFinite(Number(category.order))
    ? String(Number(category.order))
    : "999";
  el.catStatus.value = category.status === "active" ? "active" : "inactive";
  el.catTag.value = category.tag || "";

  syncBackgroundTextToColor();
  el.catImageFile.value = "";
  el.catInnerImageFile.value = "";

  renderCategorySummary(category);
  updateOperateButtons();

  await Promise.all([
    setCategoryImagePreview(el.catImagePreview, category.image),
    setCategoryImagePreview(el.catInnerImagePreview, category["inner-image"]),
  ]);
}

function resetCategoryForm() {
  state.currentCategoryId = "";

  el.catDocId.value = "";
  el.catId.value = "";
  el.catTitle.value = "";
  el.catBackground.value = "";
  applyBackgroundPreview("");
  el.catOrder.value = "999";
  el.catStatus.value = "inactive";
  el.catTag.value = "";
  el.catImageFile.value = "";
  el.catInnerImageFile.value = "";

  setPreviewSrc(el.catImagePreview, "");
  setPreviewSrc(el.catInnerImagePreview, "");
  renderCategorySummary(null);

  el.categoryPicker.value = "";
  updateCategoryDocIdPreview();
  updateOperateButtons();
}

function renderCategorySummary(category) {
  if (!category) {
    el.categorySummary.textContent = "当前为新建模式";
    return;
  }

  const lines = [
    `_id: ${category._id}`,
    `title: ${category.title}`,
    `id: ${category.id}`,
    `status: ${category.status || "inactive"}`,
    `order: ${Number.isFinite(Number(category.order)) ? Number(category.order) : 999}`,
  ];

  el.categorySummary.textContent = lines.join(" | ");
}

function updateCategoryDocIdPreview() {
  if (state.currentCategoryId) {
    return;
  }

  const idValue = Number.parseInt(el.catId.value, 10);
  if (Number.isInteger(idValue)) {
    el.catDocId.value = `type_${idValue}`;
  } else {
    el.catDocId.value = "";
  }
}

function syncBackgroundTextToColor() {
  const value = (el.catBackground.value || "").trim();
  if (!isHexColor(value)) {
    applyBackgroundPreview("");
    return;
  }
  const hex = normalizeHexColor(value);
  el.catBackgroundColor.value = hex;
  applyBackgroundPreview(hex);
}

function syncBackgroundColorToText() {
  const hex = normalizeHexColor(el.catBackgroundColor.value);
  el.catBackground.value = hex;
  applyBackgroundPreview(hex);
}

function applyBackgroundPreview(hex) {
  if (!hex) {
    el.catBackground.style.backgroundColor = "";
    el.catBackground.style.color = "";
    return;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  el.catBackground.style.backgroundColor = hex;
  el.catBackground.style.color = yiq >= 128 ? "#333" : "#fff";
}

async function previewLocalCategoryImage(fieldName) {
  try {
    const fileInput =
      fieldName === "image" ? el.catImageFile : el.catInnerImageFile;
    const previewElement =
      fieldName === "image" ? el.catImagePreview : el.catInnerImagePreview;
    const targetSize =
      fieldName === "image" ? CATEGORY_IMAGE_SIZE : CATEGORY_INNER_IMAGE_SIZE;

    const file = fileInput.files?.[0];
    if (!file) {
      return;
    }

    const blob = await processImageToWebp(file, targetSize.width, targetSize.height);
    const url = URL.createObjectURL(blob);
    setPreviewSrc(previewElement, url);
    previewElement.dataset.localBlobUrl = url;
  } catch (error) {
    toast(`预览失败: ${formatError(error)}`, "error");
  }
}

function collectCategoryForm() {
  return {
    id: Number.parseInt(el.catId.value, 10),
    title: (el.catTitle.value || "").trim(),
    background: (el.catBackground.value || "").trim(),
    order: Number.parseInt(el.catOrder.value, 10),
    status: el.catStatus.value === "active" ? "active" : "inactive",
    tag: (el.catTag.value || "").trim(),
    imageFile: el.catImageFile.files?.[0] || null,
    innerImageFile: el.catInnerImageFile.files?.[0] || null,
  };
}

function validateCategoryForm(form, currentCategory) {
  if (!Number.isInteger(form.id)) {
    throw new Error("分类 id 必须是数字");
  }

  if (!form.title) {
    throw new Error("分类 title 必填");
  }

  if (!isHexColor(form.background)) {
    throw new Error("background 必须是 hex 颜色，例如 #FF8CD8");
  }

  if (!Number.isInteger(form.order)) {
    form.order = 999;
  }

  const currentDocId = currentCategory?._id || "";

  const duplicateId = state.categories.find(
    (item) => item.id === form.id && item._id !== currentDocId,
  );
  if (duplicateId) {
    throw new Error(`分类 id=${form.id} 已存在`);
  }

  const duplicateTitle = state.categories.find(
    (item) => item.title === form.title && item._id !== currentDocId,
  );
  if (duplicateTitle) {
    throw new Error(`分类 title=${form.title} 已存在`);
  }

  if (!currentCategory && !form.imageFile) {
    throw new Error("新增分类必须上传 image");
  }

  if (!currentCategory && !form.innerImageFile) {
    throw new Error("新增分类必须上传 inner-image");
  }
}

async function onSaveCategory(event) {
  event.preventDefault();

  try {
    ensureCanOperate();

    const currentCategory = state.categories.find(
      (item) => item._id === state.currentCategoryId,
    );
    const form = collectCategoryForm();
    validateCategoryForm(form, currentCategory || null);

    const targetDocId = `type_${form.id}`;
    let imageValue = currentCategory?.image || "";
    let innerImageValue = currentCategory?.["inner-image"] || "";

    if (form.imageFile) {
      try {
        const processedImage = await processImageToWebp(
          form.imageFile,
          CATEGORY_IMAGE_SIZE.width,
          CATEGORY_IMAGE_SIZE.height,
        );
        imageValue = await uploadCategoryImage(processedImage, form.imageFile);
      } catch (error) {
        throw new Error(`image 上传失败: ${formatError(error)}`);
      }
    }

    if (form.innerImageFile) {
      try {
        const processedInnerImage = await processImageToWebp(
          form.innerImageFile,
          CATEGORY_INNER_IMAGE_SIZE.width,
          CATEGORY_INNER_IMAGE_SIZE.height,
        );
        innerImageValue = await uploadCategoryImage(processedInnerImage, form.innerImageFile);
      } catch (error) {
        throw new Error(`inner-image 上传失败: ${formatError(error)}`);
      }
    }

    const payload = {
      id: form.id,
      title: form.title,
      background: normalizeHexColor(form.background),
      image: imageValue,
      "inner-image": innerImageValue,
      order: Number.isInteger(form.order) ? form.order : 999,
      status: form.status,
      tag: form.tag,
    };

    const oldImageCandidates = [];
    const oldInnerImageCandidates = [];

    if (!currentCategory) {
      const addRes = await state.db.collection(CATEGORY_COLLECTION).add({
        _id: targetDocId,
        ...payload,
      });
      assertDbResultOk(addRes, "新增分类", { expectId: true });
    } else {
      const currentDocId = currentCategory._id;

      if (form.imageFile && shouldDeleteReplacedStorageValue(currentCategory.image, imageValue)) {
        oldImageCandidates.push(currentCategory.image);
      }
      if (
        form.innerImageFile &&
        shouldDeleteReplacedStorageValue(
          currentCategory["inner-image"],
          innerImageValue,
        )
      ) {
        oldInnerImageCandidates.push(currentCategory["inner-image"]);
      }

      if (currentDocId !== targetDocId) {
        const addRes = await state.db.collection(CATEGORY_COLLECTION).add({
          _id: targetDocId,
          ...payload,
        });
        assertDbResultOk(addRes, "迁移分类新文档", { expectId: true });

        if (currentCategory.id !== form.id) {
          const wordUpdateRes = await state.db
            .collection(WORD_COLLECTION)
            .where({ category_id: currentCategory.id })
            .update({ category_id: form.id });
          assertDbResultOk(wordUpdateRes, "更新词语关联分类", {
            expectField: "updated",
            allowZero: true,
          });
        }

        const removeOldRes = await state.db
          .collection(CATEGORY_COLLECTION)
          .doc(currentDocId)
          .remove();
        assertDbResultOk(removeOldRes, "删除旧分类", {
          expectField: "deleted",
          allowZero: false,
        });
      } else {
        const updateRes = await state.db
          .collection(CATEGORY_COLLECTION)
          .doc(currentDocId)
          .update(payload);
        assertDbResultOk(updateRes, "更新分类", {
          expectField: "updated",
          allowZero: true,
        });
      }
    }

    if (oldImageCandidates.length > 0) {
      await removeStorageFiles(oldImageCandidates);
    }
    if (oldInnerImageCandidates.length > 0) {
      await removeStorageFiles(oldInnerImageCandidates);
    }

    await loadCategories();
    const savedCategory = state.categories.find((item) => item._id === targetDocId);
    if (savedCategory) {
      el.categoryPicker.value = savedCategory._id;
      await fillCategoryForm(savedCategory);
    }

    await refreshWordResultsIfSearched();
    toast("分类保存成功", "success");
  } catch (error) {
    toast(`分类保存失败: ${formatError(error)}`, "error");
  }
}

async function onDeleteCategory() {
  try {
    ensureCanOperate();

    if (!state.currentCategoryId) {
      throw new Error("请先选择一个分类");
    }

    const currentCategory = state.categories.find(
      (item) => item._id === state.currentCategoryId,
    );
    if (!currentCategory) {
      throw new Error("当前分类不存在");
    }

    const countRes = await state.db
      .collection(WORD_COLLECTION)
      .where({ category_id: currentCategory.id })
      .count();
    assertDbResultOk(countRes, "读取分类词语数量");
    const linkedWords = Number(countRes.total || 0);

    let confirmText = `确认删除分类 ${currentCategory.title}（id=${currentCategory.id}）吗？`;
    if (linkedWords > 0) {
      confirmText += `\n该分类下还有 ${linkedWords} 条词语，会一并删除。`;
    }

    const confirmed = window.confirm(confirmText);
    if (!confirmed) {
      return;
    }

    if (linkedWords > 0) {
      const removeWordsRes = await state.db
        .collection(WORD_COLLECTION)
        .where({ category_id: currentCategory.id })
        .remove();
      assertDbResultOk(removeWordsRes, "删除分类下词语", {
        expectField: "deleted",
        allowZero: true,
      });
    }

    const removeCategoryRes = await state.db
      .collection(CATEGORY_COLLECTION)
      .doc(currentCategory._id)
      .remove();
    assertDbResultOk(removeCategoryRes, "删除分类", {
      expectField: "deleted",
      allowZero: false,
    });

    const filesToDelete = [currentCategory.image, currentCategory["inner-image"]].filter(
      (item) => canDeleteStorageValue(item),
    );
    if (filesToDelete.length > 0) {
      await removeStorageFiles(filesToDelete);
    }

    resetCategoryForm();
    await loadCategories();
    await refreshWordResultsIfSearched();
    toast("分类已删除", "success");
  } catch (error) {
    toast(`删除分类失败: ${formatError(error)}`, "error");
  }
}

async function queryAll(collectionName, where = {}, options = {}) {
  const pageSize = 100;
  const maxRows = Number(options.maxRows || MAX_QUERY_ROWS);
  let skip = 0;
  let list = [];

  while (skip < maxRows) {
    let query = state.db.collection(collectionName).where(where);

    if (options.orderByField) {
      query = query.orderBy(options.orderByField, options.orderByOrder || "asc");
    }

    const res = await query.skip(skip).limit(pageSize).get();
    assertDbResultOk(res, `${collectionName} 查询`);
    const chunk = Array.isArray(res.data) ? res.data : [];

    list = list.concat(chunk);
    if (chunk.length < pageSize) {
      break;
    }

    skip += chunk.length;
  }

  return list;
}

async function searchWords(options = {}) {
  ensureCanOperate();

  const keyword = (el.wordSearchKeyword.value || "").trim();
  const categoryFilter = Number.parseInt(el.wordSearchCategory.value, 10);
  const hasCategoryFilter = Number.isInteger(categoryFilter);

  if (!keyword && !hasCategoryFilter) {
    clearWordResults("请先输入关键词或选择分类后搜索");
    if (!options.silent) {
      toast("请先输入关键词或选择分类再搜索", "info");
    }
    return [];
  }

  let result = [];

  if (keyword) {
    const regexSafeKeyword = escapeRegExp(keyword);
    try {
      const where = {};
      where.word = state.db.RegExp({ regexp: regexSafeKeyword, options: "i" });
      if (hasCategoryFilter) {
        where.category_id = categoryFilter;
      }
      result = await queryAll(WORD_COLLECTION, where, { maxRows: MAX_QUERY_ROWS });
    } catch (error) {
      const fallbackWhere = hasCategoryFilter
        ? { category_id: categoryFilter }
        : {};
      result = await queryAll(WORD_COLLECTION, fallbackWhere, { maxRows: MAX_QUERY_ROWS });
      result = result.filter((item) =>
        String(item.word || "")
          .toLowerCase()
          .includes(keyword.toLowerCase()),
      );
      toast("当前环境不支持正则检索，已切换本地过滤", "error");
    }
  } else {
    const where = hasCategoryFilter
      ? { category_id: categoryFilter }
      : {};
    result = await queryAll(WORD_COLLECTION, where, { maxRows: MAX_QUERY_ROWS });
  }

  result.sort((a, b) => {
    const wordA = String(a.word || "");
    const wordB = String(b.word || "");
    return wordA.localeCompare(wordB, "zh-CN");
  });

  state.words = result;
  state.hasSearchedWords = true;
  renderWordList();
  el.wordSearchStats.textContent = `共 ${result.length} 条`;

  return result;
}

async function refreshWordResultsIfSearched() {
  if (!state.hasSearchedWords) {
    return;
  }

  await searchWords({ silent: true });
}

function clearWordResults(statsText = "请先输入关键词或选择分类后搜索") {
  state.words = [];
  state.currentWordId = "";
  state.hasSearchedWords = false;

  renderWordList();
  el.wordSearchStats.textContent = statsText;
  updateOperateButtons();
}

async function onSearchWords() {
  try {
    await searchWords();
  } catch (error) {
    toast(`搜索失败: ${formatError(error)}`, "error");
  }
}

async function onResetWordSearch() {
  try {
    el.wordSearchKeyword.value = "";
    el.wordSearchCategory.value = "";
    clearWordResults("已重置，请输入关键词或选择分类后搜索");
    resetWordForm();
  } catch (error) {
    toast(`重置失败: ${formatError(error)}`, "error");
  }
}

function renderWordList() {
  el.wordList.innerHTML = "";

  if (state.words.length === 0) {
    const empty = document.createElement("div");
    empty.className = "word-item";
    empty.textContent = state.hasSearchedWords
      ? "没有匹配的词语"
      : "请先输入关键词或选择分类后点击搜索";
    el.wordList.appendChild(empty);
    return;
  }

  state.words.forEach((item) => {
    const categoryTitle = getCategoryTitleById(item.category_id);

    const wrapper = document.createElement("div");
    wrapper.className = "word-item";
    if (state.currentWordId && state.currentWordId === item._id) {
      wrapper.classList.add("active");
    }

    wrapper.innerHTML = `
      <div class="word-main">${escapeHtml(item.word || "")}</div>
      <div class="word-meta">
        _id: ${escapeHtml(item._id || "")}
        | category_id: ${escapeHtml(String(item.category_id ?? ""))}
        | title: ${escapeHtml(categoryTitle || "-")}
        | status: ${escapeHtml(item.status || "active")}
        | v: ${escapeHtml(String(item.v ?? 1))}
      </div>
    `;

    wrapper.addEventListener("click", () => fillWordForm(item));
    el.wordList.appendChild(wrapper);
  });
}

function getCategoryTitleById(categoryId) {
  const item = state.categories.find((category) => category.id === Number(categoryId));
  return item ? item.title : "";
}

function fillWordForm(item) {
  state.currentWordId = item._id || "";
  el.wordDocId.value = item._id || "";
  el.wordCategoryId.value = String(item.category_id || "");
  el.wordStatus.value = item.status === "inactive" ? "inactive" : "active";
  el.wordV.value = Number.isInteger(Number(item.v)) ? String(Number(item.v)) : "1";
  el.wordText.value = item.word || "";

  syncWordCategoryTitle();
  updateOperateButtons();
  renderWordList();
}

function resetWordForm() {
  state.currentWordId = "";
  el.wordDocId.value = "";
  el.wordCategoryId.value = "";
  el.wordCategoryTitle.value = "";
  el.wordStatus.value = "active";
  el.wordV.value = "1";
  el.wordText.value = "";

  updateOperateButtons();
  renderWordList();
}

function syncWordCategoryTitle() {
  const categoryId = Number.parseInt(el.wordCategoryId.value, 10);
  if (!Number.isInteger(categoryId)) {
    el.wordCategoryTitle.value = "";
    return;
  }

  el.wordCategoryTitle.value = getCategoryTitleById(categoryId) || "";
}

function calcWordLength(word) {
  let len = 0;
  for (const ch of String(word)) {
    len += /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(ch) ? 2 : 1;
  }
  return len;
}

function collectWordForm() {
  return {
    _id: (el.wordDocId.value || "").trim(),
    category_id: Number.parseInt(el.wordCategoryId.value, 10),
    status: el.wordStatus.value === "inactive" ? "inactive" : "active",
    v: Number.parseInt(el.wordV.value, 10),
    word: (el.wordText.value || "").trim(),
  };
}

function validateWordForm(form) {
  if (!Number.isInteger(form.category_id)) {
    throw new Error("category_id 必须选择");
  }

  if (!form.word) {
    throw new Error("word 必填");
  }

  if (!Number.isInteger(form.v)) {
    form.v = 1;
  }
}

async function onSaveWord(event) {
  event.preventDefault();

  try {
    ensureCanOperate();

    const form = collectWordForm();
    validateWordForm(form);
    let successText = "";

    if (form._id) {
      const dup = await state.db
        .collection(WORD_COLLECTION)
        .where({ category_id: form.category_id, word: form.word })
        .limit(1)
        .get();
      const duplicate = Array.isArray(dup.data) ? dup.data[0] : null;
      if (duplicate && duplicate._id !== form._id) {
        throw new Error("同一分类下该词语已存在");
      }

      const updateRes = await state.db.collection(WORD_COLLECTION).doc(form._id).update({
        category_id: form.category_id,
        status: form.status,
        v: form.v,
        word: form.word,
        l: calcWordLength(form.word),
      });
      assertDbResultOk(updateRes, "更新词语", {
        expectField: "updated",
        allowZero: true,
      });

      state.currentWordId = form._id;
      successText = "词语更新成功";
    } else {
      const exists = await state.db
        .collection(WORD_COLLECTION)
        .where({ category_id: form.category_id, word: form.word })
        .limit(1)
        .get();
      if (Array.isArray(exists.data) && exists.data.length > 0) {
        throw new Error("同一分类下该词语已存在");
      }

      const addRes = await state.db.collection(WORD_COLLECTION).add({
        category_id: form.category_id,
        status: form.status,
        v: form.v,
        word: form.word,
        l: calcWordLength(form.word),
      });
      assertDbResultOk(addRes, "新增词语", { expectId: true });

      state.currentWordId = addRes._id || addRes.id || "";
      successText = "词语新增成功";
    }

    await refreshWordResultsIfSearched();

    if (state.currentWordId) {
      const current = state.words.find((item) => item._id === state.currentWordId);
      if (current) {
        fillWordForm(current);
      }
    }

    if (successText) {
      toast(successText, "success");
    }
  } catch (error) {
    toast(`词语保存失败: ${formatError(error)}`, "error");
  }
}

async function onDeleteWord() {
  try {
    ensureCanOperate();

    if (!state.currentWordId) {
      throw new Error("请先选择词语");
    }

    const target = state.words.find((item) => item._id === state.currentWordId);
    const confirmed = window.confirm(
      `确认删除词语 ${target?.word || state.currentWordId} 吗？`,
    );
    if (!confirmed) {
      return;
    }

    const removeRes = await state.db.collection(WORD_COLLECTION).doc(state.currentWordId).remove();
    assertDbResultOk(removeRes, "删除词语", {
      expectField: "deleted",
      allowZero: false,
    });
    resetWordForm();
    await refreshWordResultsIfSearched();
    toast("词语已删除", "success");
  } catch (error) {
    toast(`删除词语失败: ${formatError(error)}`, "error");
  }
}

async function onBatchImportWords() {
  try {
    ensureCanOperate();

    const categoryId = Number.parseInt(el.batchCategoryId.value, 10);
    if (!Number.isInteger(categoryId)) {
      throw new Error("批量导入必须选择 category_id");
    }

    const status = el.batchStatus.value === "inactive" ? "inactive" : "active";
    const v = Number.parseInt(el.batchV.value, 10);
    const safeV = Number.isInteger(v) ? v : 1;

    const raw = el.batchWordsText.value || "";
    const words = parseBatchWords(raw);

    if (words.length === 0) {
      throw new Error("请先输入要导入的词语，使用逗号分隔");
    }

    const existingWords = await queryAll(
      WORD_COLLECTION,
      { category_id: categoryId },
      { maxRows: MAX_QUERY_ROWS },
    );

    const existingSet = new Set(existingWords.map((item) => String(item.word || "").trim()));
    const toInsert = words.filter((item) => !existingSet.has(item));

    if (toInsert.length === 0) {
      el.batchImportResult.textContent = `输入 ${words.length} 个，全部已存在，未导入`;
      toast("全部词语已存在", "success");
      return;
    }

    let inserted = 0;
    let failed = 0;

    const chunkSize = 20;
    for (let index = 0; index < toInsert.length; index += chunkSize) {
      const chunk = toInsert.slice(index, index + chunkSize);
      const tasks = chunk.map(async (word) => {
        const addRes = await state.db.collection(WORD_COLLECTION).add({
          category_id: categoryId,
          status,
          v: safeV,
          word,
          l: calcWordLength(word),
        });
        assertDbResultOk(addRes, `导入词语 ${word}`, { expectId: true });
        return addRes;
      });

      const settled = await Promise.allSettled(tasks);
      settled.forEach((result) => {
        if (result.status === "fulfilled") {
          inserted += 1;
        } else {
          failed += 1;
        }
      });
    }

    const skipped = words.length - toInsert.length;
    el.batchImportResult.textContent = `输入 ${words.length} 个，成功 ${inserted}，失败 ${failed}，跳过重复 ${skipped}`;

    await refreshWordResultsIfSearched();
    if (failed > 0) {
      toast(`批量导入部分失败（失败 ${failed}）`, "error");
    } else {
      toast("批量导入完成", "success");
    }
  } catch (error) {
    toast(`批量导入失败: ${formatError(error)}`, "error");
  }
}

function assertDbResultOk(result, actionLabel, options = {}) {
  if (!result || typeof result !== "object") {
    throw new Error(`${actionLabel}失败：未返回结果`);
  }

  const code = String(result.code || "").trim();
  const message = String(result.message || "").trim();
  const signal = `${code} ${message}`.trim();

  if (/DATABASE_PERMISSION_DENIED|permission denied|permission_denied/i.test(signal)) {
    throw new Error(message || code || `${actionLabel}失败：没有权限`);
  }

  if (code && code !== "SUCCESS" && code !== "0") {
    throw new Error(message || `${actionLabel}失败（${code}）`);
  }

  if (options.expectId && !result.id) {
    throw new Error(`${actionLabel}失败：未返回文档 ID`);
  }

  if (options.expectField) {
    const affected = Number(result[options.expectField] || 0);
    const allowZero = Boolean(options.allowZero);
    if (!allowZero && affected <= 0) {
      throw new Error(`${actionLabel}失败：未影响任何数据`);
    }
  }

  return result;
}

function parseBatchWords(raw) {
  const values = raw
    .split(/[\n\r,，]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  const unique = [];
  const set = new Set();

  values.forEach((item) => {
    if (!set.has(item)) {
      set.add(item);
      unique.push(item);
    }
  });

  return unique;
}

async function processImageToWebp(file, targetWidth, targetHeight) {
  const image = await loadImageByFile(file);
  const canvas = drawCoverCanvas(image, targetWidth, targetHeight);

  let quality = 0.86;
  let blob = await canvasToWebpBlob(canvas, quality);

  const maxBytes = targetWidth * targetHeight > 500000 ? 420 * 1024 : 320 * 1024;
  while (blob.size > maxBytes && quality > 0.58) {
    quality -= 0.07;
    blob = await canvasToWebpBlob(canvas, quality);
  }

  return blob;
}

function loadImageByFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片读取失败"));
    };

    image.src = objectUrl;
  });
}

function drawCoverCanvas(image, targetWidth, targetHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器不支持 Canvas");
  }

  const sourceWidth = image.width;
  const sourceHeight = image.height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  let sx = 0;
  let sy = 0;
  let sWidth = sourceWidth;
  let sHeight = sourceHeight;

  if (sourceRatio > targetRatio) {
    sWidth = Math.round(sourceHeight * targetRatio);
    sx = Math.round((sourceWidth - sWidth) / 2);
  } else {
    sHeight = Math.round(sourceWidth / targetRatio);
    sy = Math.round((sourceHeight - sHeight) / 2);
  }

  context.drawImage(
    image,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return canvas;
}

function canvasToWebpBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("转换 webp 失败"));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

async function uploadCategoryImage(blob, originalFile) {
  const stem = originalFile.name.replace(/\.[^.]+$/, "");
  const fileName = `${stem}.webp`;
  const path = `${normalizeStoragePrefix(state.config.storagePrefix)}/${fileName}`;

  const postAttempt = await tryUploadWithPost(path, blob);
  if (!postAttempt.ok) {
    const putAttempt = await tryUploadWithPut(path, blob);
    if (!putAttempt.ok) {
      const postError = postAttempt.errorText || "未知错误";
      const putError = putAttempt.errorText || "未知错误";
      const currentOrigin = window.location.origin || "当前后台域名";
      throw new Error(
        `上传失败（post: ${postError} | put: ${putError}）。若网络面板出现 preflight 403，请在腾讯云 COS 跨域配置里放行当前后台域名（例如 ${currentOrigin}）。`,
      );
    }
  }

  return fileName;
}

async function tryUploadWithPost(path, blob) {
  try {
    const result = await state.storage.uploadFile({
      cloudPath: path,
      filePath: blob,
      method: "post",
    });

    if (result?.error) {
      return { ok: false, errorText: extractStorageErrorText(result.error) };
    }

    if (result?.fileID || result?.fileId || result?.id) {
      return { ok: true };
    }

    const code = String(result?.code || "").trim();
    if (code && code !== "SUCCESS" && code !== "0") {
      return { ok: false, errorText: extractStorageErrorText(result) };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, errorText: extractStorageErrorText(error) };
  }
}

async function tryUploadWithPut(path, blob) {
  try {
    const result = await state.storage.upload(path, blob);
    if (result?.error) {
      return { ok: false, errorText: extractStorageErrorText(result.error) };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, errorText: extractStorageErrorText(error) };
  }
}

function extractStorageErrorText(error) {
  const text =
    typeof error === "string"
      ? error
      : [
          error?.code,
          error?.errCode,
          error?.message,
          error?.msg,
          safeJsonStringify(error),
        ]
          .filter(Boolean)
          .join(" | ");

  return text || "未知错误";
}

async function removeStorageFiles(fileIds) {
  const targets = [...new Set(fileIds.map((item) => toStorageDeleteTarget(item)).filter(Boolean))];

  if (targets.length === 0) {
    return;
  }

  const removeRes = await state.storage.remove(targets);
  if (removeRes.error) {
    throw new Error(removeRes.error.message || "删除存储文件失败");
  }
}

async function setCategoryImagePreview(imageElement, value) {
  const raw = String(value || "").trim();
  if (!raw) {
    setPreviewSrc(imageElement, "");
    return;
  }

  if (/^https?:\/\//i.test(raw)) {
    setPreviewSrc(imageElement, raw);
    return;
  }

  if (isCloudFileId(raw)) {
    try {
      const signedUrl = await getSignedUrl(raw);
      setPreviewSrc(imageElement, signedUrl || "");
      return;
    } catch (error) {
      const fallbackUrl = buildPublicImageUrl(raw);
      setPreviewSrc(imageElement, fallbackUrl || "");
      return;
    }
  }

  const url = buildPublicImageUrl(raw);
  setPreviewSrc(imageElement, url);
}

function setPreviewSrc(imageElement, url) {
  const oldUrl = imageElement.dataset.localBlobUrl;
  if (oldUrl && oldUrl.startsWith("blob:")) {
    URL.revokeObjectURL(oldUrl);
  }

  delete imageElement.dataset.localBlobUrl;
  imageElement.src = url || "";
}

async function getSignedUrl(fileId) {
  const now = Date.now();
  const cached = state.signedUrlCache.get(fileId);

  if (cached && cached.expireAt > now) {
    return cached.url;
  }

  const signedRes = await state.storage.createSignedUrl(fileId, 3600);
  if (signedRes.error) {
    throw new Error(signedRes.error.message || "获取预览链接失败");
  }

  const url = signedRes.data?.signedUrl || "";
  state.signedUrlCache.set(fileId, {
    url,
    expireAt: now + 55 * 60 * 1000,
  });

  return url;
}

function isCloudFileId(value) {
  return typeof value === "string" && value.startsWith("cloud://");
}

function canDeleteStorageValue(value) {
  return Boolean(toStorageDeleteTarget(value));
}

function shouldDeleteReplacedStorageValue(oldValue, newValue) {
  const oldTarget = toStorageDeleteTarget(oldValue);
  const newTarget = toStorageDeleteTarget(newValue);
  return Boolean(oldTarget) && oldTarget !== newTarget;
}

function toStorageDeleteTarget(value) {
  let raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (isCloudFileId(raw)) {
    return raw;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const name = decodeURIComponent(url.pathname.split("/").pop() || "").trim();
      if (!name) {
        return "";
      }
      return `${normalizeStoragePrefix(state.config.storagePrefix)}/${name}`;
    } catch (error) {
      return "";
    }
  }

  if (raw.includes("/")) {
    return raw.replace(/^\/+/, "");
  }

  return `${normalizeStoragePrefix(state.config.storagePrefix)}/${raw}`;
}

function normalizeStoragePrefix(prefix) {
  const cleaned = String(prefix || DEFAULT_STORAGE_PREFIX)
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return cleaned || DEFAULT_STORAGE_PREFIX;
}

function extractBucketIdFromPublicUrl(url) {
  try {
    return new URL(url).hostname.split(".")[0] || "";
  } catch (error) {
    return "";
  }
}

function buildPublicImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const fileName = decodeStorageValueToFileName(raw);
  if (!fileName) {
    return "";
  }

  const base = DEFAULT_IMAGE_BASE_URL.replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(fileName)}`;
}

function decodeStorageValueToFileName(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.includes("/")) {
    return raw.split("/").pop() || "";
  }

  return raw;
}

function isHexColor(value) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value || "");
}

function normalizeHexColor(value) {
  return String(value || "").toUpperCase();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatError(error) {
  if (!error) {
    return "未知错误";
  }

  const text =
    typeof error === "string"
      ? error
      : [
          error.code,
          error.errCode,
          error.message,
          error.error_description,
          error.msg,
          safeJsonStringify(error),
        ]
          .filter(Boolean)
          .join(" | ");

  if (/DATABASE_PERMISSION_DENIED|permission denied|permission_denied/i.test(text)) {
    return "没有数据库写权限。你已登录也可能因为角色权限不足：请到云开发控制台 -> 身份认证 -> 权限控制，确认当前账号有写权限；再到数据库 -> 集合权限，给 category_list 和 words 配置可写规则。";
  }

  return text || "未知错误";
}

function safeJsonStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return "";
  }
}

function toast(message, type = "info") {
  el.toast.textContent = message;
  el.toast.className = `toast show ${type}`;

  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    el.toast.className = "toast";
  }, 2600);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
