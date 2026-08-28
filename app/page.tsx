"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

type FontSize = "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "3xl" | "4xl" | "5xl";
type ButtonStyle = "primary" | "secondary" | "link";
type ImageSourceMode = "upload" | "url";

type CardButton = {
  id: string;
  text: string;
  link: string;
  color: string;
  style: ButtonStyle;
};

type CardConfig = {
  id: string;
  image: string;
  imageBackgroundColor?: string;
  link: string;
  title: string;
  description: string;
  backgroundColor: string;
  titleColor: string;
  descriptionColor: string;
  buttons: CardButton[];
};

type BuilderSettings = {
  altText: string;
  ratio: string;
  titleSize: FontSize;
  descriptionSize: FontSize;
  buttonHeight: "sm" | "md";
  chatName: string;
  liffId: string;
};

type BuilderState = {
  version: 1;
  settings: BuilderSettings;
  cards: CardConfig[];
};

type Account = {
  displayName: string;
  role: "user" | "admin";
  plan: "free" | "monthly" | "annual" | "lifetime";
  vip: boolean;
};

type FavoriteSummary = {
  id: string;
  name: string;
  previewImage: string | null;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "line-card-lab:v5";
const FONT_SIZES: FontSize[] = ["xxs", "xs", "sm", "md", "lg", "xl", "xxl", "3xl", "4xl", "5xl"];
const COMPAT_SHARE_PAGE = "https://liff.line.me/1654437282-A1Bj7p4a/share-json5gzip.html";
const COMPAT_TEMPLATE = "https://taichunmin.idv.tw/liff-businesscard/cards/line-carousel-1.txt";

const CATALOG_TEMPLATES = [
  { form: "custom-line-carousel", name: "多頁訊息 1", preview: "https://i.imgur.com/yBjZFmf.png", description: "來自 LINE 的樣板，最多 12 張卡片，很適合用來製作廣告傳單。" },
  { form: "chatgpt-1", name: "ChatGPT 問與答", preview: "https://i.imgur.com/0uU5aCG.png", description: "让你在 LINE 中模拟 ChatGPT 的问答画面，上面有开启自订链接及再次分享的按钮。" },
  { form: "json5", name: "JSON5", preview: "https://i.imgur.com/ci4T6xG.png", description: "提供给有程式背景的开发者使用，可以使用 JSON5 API 来当作样板的资料来源。" },
  { form: "psprint-592", name: "Corporate Buzz", preview: "https://i.imgur.com/AjbhMam.png", description: "来自 PsPrint 的样板，上面有链接可以开启，很适合用来制作个人名片。" },
  { form: "google-sheet", name: "Google Sheet", preview: "https://i.imgur.com/Jdb68bE.png", description: "从 Google Sheet 读取名片资料来产生名片。" },
  { form: "csv", name: "CSV", preview: "https://i.imgur.com/CU3myIc.png", description: "从 CSV 读取名片资料来产生名片。" },
  { form: "facebook-post-link-1", name: "Facebook Post Link", preview: "https://i.imgur.com/hO0LAHK.png", description: "让你在 LINE 中模拟 Facebook 分享链接，并且还可再次分享。" },
  { form: "psprint-3949", name: "Right Align", preview: "https://i.imgur.com/tUvhifE.png", description: "来自 PsPrint 的样板，上面有链接可以开启，很适合用来制作个人名片。" },
  { form: "acnh-passport-1", name: "動物森友會護照", preview: "https://i.imgur.com/rGRMSdy.png", description: "《集合啦！动物森友会》的护照。" },
  { form: "acnh-postcard-1", name: "動物森友會心意卡", preview: "https://i.imgur.com/gJASJdW.png", description: "来自《集合啦！动物森友会》的心意卡。" },
  { form: "chatbot-tw-1", name: "Chatbot 台灣開發者", preview: "https://i.imgur.com/lEKHcUY.png", description: "Chatbot Developers Taiwan 的名片。" },
] as const;

const LEGACY_SECOND_BUTTON: CardButton = {
  id: "strategy-work",
  text: "查看服务与案例",
  link: "https://example.com/work",
  color: "#167a47",
  style: "link",
};

const DEFAULT_CARD: CardConfig = {
  id: "brand-strategy",
  image: "https://i.imgur.com/yBjZFmf.png",
  link: "",
  title: "Arm Chair, White",
  description: "售價：USD $49.99",
  backgroundColor: "#ffffff",
  titleColor: "#111815",
  descriptionColor: "#69716d",
  buttons: [
    {
      id: "strategy-book",
      text: "Add to Cart",
      link: "www.google.com",
      color: "#06c755",
      style: "primary",
    },
  ],
};

const LEGACY_SECOND_CARD: CardConfig = {
  id: "web-experience",
  image: "https://images.unsplash.com/photo-1559028012-481c04fa702d?auto=format&fit=crop&w=1200&q=85",
  link: "https://example.com/web",
  title: "让网页成为品牌最好用的名片",
  description: "兼顾叙事、转化与速度，做一套真正能长期使用的数字体验。",
  backgroundColor: "#efffe8",
  titleColor: "#102117",
  descriptionColor: "#516057",
  buttons: [
    {
      id: "web-plan",
      text: "查看网页方案",
      link: "https://example.com/web-plan",
      color: "#102117",
      style: "primary",
    },
  ],
};

const DEFAULT_STATE: BuilderState = {
  version: 1,
  settings: {
    altText: "",
    ratio: "20:13",
    titleSize: "xl",
    descriptionSize: "sm",
    buttonHeight: "sm",
    chatName: "官网邀请",
    liffId: "",
  },
  cards: [DEFAULT_CARD],
};

function migrateLegacyDefault(state: BuilderState) {
  const legacyCards = [
    { ...DEFAULT_CARD, buttons: [...DEFAULT_CARD.buttons, LEGACY_SECOND_BUTTON] },
    LEGACY_SECOND_CARD,
  ];
  return JSON.stringify(state.cards) === JSON.stringify(legacyCards)
    ? { ...state, cards: [DEFAULT_CARD] }
    : state;
}

function newId(prefix: string) {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${suffix}`;
}

function safeUri(uri: string) {
  const value = uri.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(?:www\.)?[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d+)?(?:[/?#].*)?$/i.test(value)) return `https://${value}`;
  return "https://line.me";
}

function imageEdgeColor(image: HTMLImageElement) {
  const sampleSize = 32;
  const canvas = document.createElement("canvas");
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "";
  context.drawImage(image, 0, 0, sampleSize, sampleSize);
  const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let index = 0; index < sampleSize; index += 2) {
    for (const offset of [index, (sampleSize - 1) * sampleSize + index, index * sampleSize, index * sampleSize + sampleSize - 1]) {
      const pixel = offset * 4;
      if (pixels[pixel + 3] < 128) continue;
      red += pixels[pixel];
      green += pixels[pixel + 1];
      blue += pixels[pixel + 2];
      count += 1;
    }
  }
  if (!count) return "";
  const hex = (value: number) => Math.round(value / count).toString(16).padStart(2, "0");
  return `#${hex(red)}${hex(green)}${hex(blue)}`;
}

async function prepareImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1024;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("浏览器无法处理这张图片");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new Error("图片处理失败");
  return blob;
}

function toCompatibilityVcard(state: BuilderState) {
  return {
    altText: state.settings.altText,
    btnHeight: state.settings.buttonHeight,
    descSize: state.settings.descriptionSize,
    ratio: state.settings.ratio,
    titleSize: state.settings.titleSize,
    cards: state.cards.map((card) => ({
      bgColor: card.backgroundColor,
      desc: card.description,
      descColor: card.descriptionColor,
      image: card.image,
      link: safeUri(card.buttons[0]?.link || ""),
      title: card.title,
      titleColor: card.titleColor,
      btns: card.buttons.map((button) => ({
        color: button.color,
        link: safeUri(button.link),
        style: button.style,
        text: button.text,
      })),
    })),
  };
}

function sortForStableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForStableJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortForStableJson(item)]),
  );
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 32768) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function textToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

async function createCompatibilityLink(state: BuilderState) {
  if (!("CompressionStream" in window)) throw new Error("当前浏览器不支持链接压缩");
  const payload = JSON.stringify(sortForStableJson(toCompatibilityVcard(state)));
  const compressed = new Blob([payload])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  const bytes = new Uint8Array(await new Response(compressed).arrayBuffer());
  const url = new URL(COMPAT_SHARE_PAGE);
  url.searchParams.set("template", textToBase64Url(COMPAT_TEMPLATE));
  url.searchParams.set("json5gzip", bytesToBase64Url(bytes));
  return url.href;
}

function normalizeImported(raw: unknown): BuilderState {
  if (!raw || typeof raw !== "object") throw new Error("文件内容不是有效对象");
  const input = raw as Record<string, unknown>;

  if (input.settings && Array.isArray(input.cards)) {
    const imported = input as unknown as BuilderState;
    if (!imported.cards.length) throw new Error("至少需要一张卡片");
    return { ...imported, version: 1 };
  }

  const json5 = (input.json5 || input) as Record<string, unknown>;
  if (!Array.isArray(json5.cards)) throw new Error("没有找到可导入的卡片配置");

  const cards = (json5.cards as Array<Record<string, unknown>>).map((card, cardIndex) => ({
    id: newId(`import-card-${cardIndex + 1}`),
    image: String(card.image || ""),
    link: String(card.link || "https://line.me"),
    title: String(card.title || "未命名卡片"),
    description: String(card.desc || card.description || ""),
    backgroundColor: String(card.bgColor || card.backgroundColor || "#ffffff"),
    titleColor: String(card.titleColor || "#111815"),
    descriptionColor: String(card.descColor || card.descriptionColor || "#69716d"),
    buttons: (Array.isArray(card.btns) ? card.btns : Array.isArray(card.buttons) ? card.buttons : [])
      .map((button, buttonIndex) => {
        const item = button as Record<string, unknown>;
        return {
          id: newId(`import-button-${buttonIndex + 1}`),
          text: String(item.text || item.label || "查看详情"),
          link: String(item.link || item.uri || "https://line.me"),
          color: String(item.color || "#06c755"),
          style: (["primary", "secondary", "link"].includes(String(item.style))
            ? String(item.style)
            : "primary") as ButtonStyle,
        };
      }),
  }));

  return {
    version: 1,
    settings: {
      ...DEFAULT_STATE.settings,
      altText: String(json5.altText || DEFAULT_STATE.settings.altText),
      ratio: String(json5.ratio || DEFAULT_STATE.settings.ratio),
      titleSize: String(json5.titleSize || DEFAULT_STATE.settings.titleSize) as FontSize,
      descriptionSize: String(json5.descSize || json5.descriptionSize || DEFAULT_STATE.settings.descriptionSize) as FontSize,
      buttonHeight: String(json5.btnHeight || json5.buttonHeight || "sm") as "sm" | "md",
    },
    cards,
  };
}

function AccountActions({ account }: { account: Account | null | undefined }) {
  return (
    <div className="topbar-actions">
      {account?.role === "admin" && <a href="/admin">后台</a>}
      <a className={account?.vip ? "account-link vip" : "account-link"} href="/account">
        {account === undefined ? "账户" : account ? (account.vip ? "VIP 账户" : "免费账户") : "登录 / 注册"}
      </a>
    </div>
  );
}

function TemplateCatalog({ onOpenLineCarousel, account }: { onOpenLineCarousel: () => void; account: Account | null | undefined }) {
  const [loginTarget, setLoginTarget] = useState("");
  const promptLogin = (target: string) => {
    setLoginTarget(target);
    window.setTimeout(() => setLoginTarget(""), 3200);
  };

  return (
    <main className="site-shell catalog-shell" id="top">
      <header className="topbar catalog-topbar">
        <a className="brand" href="#top" aria-label="LINE 卡片实验室首页">
          <span className="brand-mark">L</span>
          <span>LINE 卡片实验室</span>
        </a>
        <AccountActions account={account} />
      </header>
      <section className="catalog-page" aria-labelledby="catalog-title">
        <div className="catalog-heading">
          <span>LINE FLEX MESSAGE</span>
          <h1 id="catalog-title">样板列表</h1>
          <p>选择一款样板，进入它自己的名片编辑表单。</p>
        </div>
        <div className="template-grid">
          {CATALOG_TEMPLATES.map((template) => (
            <article className="template-card" key={template.form}>
              <div className="template-preview"><img src={template.preview} alt={`${template.name} 样板预览`} /></div>
              <div className="template-card-body">
                <h2>{template.name}</h2>
                <p>{template.description}</p>
                {template.form === "custom-line-carousel" ? (
                  <button type="button" onClick={() => account ? onOpenLineCarousel() : promptLogin("/?template=custom-line-carousel")}>▣&nbsp; 点击建立名片</button>
                ) : account ? (
                  <a href={`/original/${template.form}`}>▣&nbsp; 点击建立名片</a>
                ) : (
                  <button type="button" onClick={() => promptLogin(`/original/${template.form}`)}>▣&nbsp; 点击建立名片</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className={`login-entry-prompt ${loginTarget ? "show" : ""}`} role="status" aria-live="polite">
        <span>请先登录</span>
        {loginTarget && <a href={`/account?returnTo=${encodeURIComponent(loginTarget)}`}>登录 / 注册</a>}
      </div>
    </main>
  );
}

export default function Home() {
  const [builder, setBuilder] = useState<BuilderState>(DEFAULT_STATE);
  const [showEditor, setShowEditor] = useState(false);
  const [activeCardId, setActiveCardId] = useState(DEFAULT_STATE.cards[0].id);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [compatibilityLink, setCompatibilityLink] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageSourceMode, setImageSourceMode] = useState<ImageSourceMode>("url");
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [favorites, setFavorites] = useState<FavoriteSummary[]>([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [activeFavoriteId, setActiveFavoriteId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshFavorites = useCallback(async () => {
    setFavoritesLoading(true);
    try {
      const response = await fetch("/api/favorites", { cache: "no-store" });
      const data = await response.json() as { favorites?: FavoriteSummary[] };
      if (response.ok) setFavorites(data.favorites || []);
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  useEffect(() => {
    const syncView = () => setShowEditor(new URLSearchParams(window.location.search).get("template") === "custom-line-carousel");
    syncView();
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user?: Account | null }) => setAccount(data.user || null))
      .catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    if (account) void refreshFavorites();
    else if (account === null) setFavorites([]);
  }, [account, refreshFavorites]);

  useEffect(() => {
    if (account !== null || new URLSearchParams(window.location.search).get("template") !== "custom-line-carousel") return;
    window.location.replace("/account?returnTo=%2F%3Ftemplate%3Dcustom-line-carousel");
  }, [account]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const normalized = migrateLegacyDefault(normalizeImported(JSON.parse(saved)));
        normalized.settings.chatName = normalized.settings.chatName || "官网邀请";
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the local draft after mount
        setBuilder(normalized);
        setActiveCardId(normalized.cards[0].id);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(builder));
  }, [builder, loaded]);

  useEffect(() => {
    let current = true;
    createCompatibilityLink(builder)
      .then((link) => { if (current) setCompatibilityLink(link); })
      .catch(() => { if (current) setCompatibilityLink(""); });
    return () => { current = false; };
  }, [builder]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const activeIndex = Math.max(0, builder.cards.findIndex((card) => card.id === activeCardId));
  const activeCard = builder.cards[activeIndex] || builder.cards[0];

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  };

  const saveFavorite = async (asNew = false) => {
    setSavingFavorite(true);
    try {
      const favoriteId = asNew ? null : activeFavoriteId;
      const response = await fetch(favoriteId ? `/api/favorites/${favoriteId}` : "/api/favorites", {
        method: favoriteId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: builder.cards[0]?.title || "未命名卡片", state: builder }),
      });
      const data = await response.json() as { favorite?: FavoriteSummary; error?: string };
      if (!response.ok || !data.favorite) throw new Error(data.error || "收藏失败");
      setActiveFavoriteId(data.favorite.id);
      await refreshFavorites();
      notify(favoriteId ? "收藏已更新" : "卡片已收藏");
    } catch (error) {
      notify(error instanceof Error ? error.message : "收藏失败");
    } finally {
      setSavingFavorite(false);
    }
  };

  const loadFavorite = async (favoriteId: string) => {
    try {
      const response = await fetch(`/api/favorites/${favoriteId}`, { cache: "no-store" });
      const data = await response.json() as { favorite?: { state?: unknown }; error?: string };
      if (!response.ok || !data.favorite?.state) throw new Error(data.error || "读取收藏失败");
      const restored = normalizeImported(data.favorite.state);
      setBuilder(restored);
      setActiveCardId(restored.cards[0].id);
      setActiveFavoriteId(favoriteId);
      setFavoritesOpen(false);
      notify("已恢复收藏，可继续编辑");
    } catch (error) {
      notify(error instanceof Error ? error.message : "读取收藏失败");
    }
  };

  const deleteFavorite = async (favorite: FavoriteSummary) => {
    if (!window.confirm(`确定删除收藏“${favorite.name}”吗？`)) return;
    try {
      const response = await fetch(`/api/favorites/${favorite.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "删除失败");
      if (activeFavoriteId === favorite.id) setActiveFavoriteId(null);
      setFavorites((current) => current.filter((item) => item.id !== favorite.id));
      notify("收藏已删除");
    } catch (error) {
      notify(error instanceof Error ? error.message : "删除失败");
    }
  };

  const updateSettings = <K extends keyof BuilderSettings>(key: K, value: BuilderSettings[K]) => {
    setBuilder((current) => ({
      ...current,
      settings: { ...current.settings, [key]: value },
    }));
  };

  const updateCard = <K extends keyof CardConfig>(key: K, value: CardConfig[K]) => {
    setBuilder((current) => ({
      ...current,
      cards: current.cards.map((card) => card.id === activeCard.id ? { ...card, [key]: value } : card),
    }));
  };

  const updateButton = <K extends keyof CardButton>(buttonId: string, key: K, value: CardButton[K]) => {
    updateCard("buttons", activeCard.buttons.map((button) => button.id === buttonId ? { ...button, [key]: value } : button));
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return notify("请选择图片文件");
    if (file.size > 10 * 1024 * 1024) return notify("图片不能超过 10MB");

    setUploadingImage(true);
    try {
      const image = await prepareImage(file);
      const formData = new FormData();
      formData.append("file", image, "card-image.jpg");
      const response = await fetch("/api/images", { method: "POST", body: formData });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "图片上传失败");
      updateCard("imageBackgroundColor", "");
      updateCard("image", result.url);
      notify("图片已上传");
    } catch (error) {
      notify(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploadingImage(false);
    }
  };

  const addCard = () => {
    const card: CardConfig = {
      id: newId("card"),
      image: "",
      link: "",
      title: "",
      description: "",
      backgroundColor: "#ffffff",
      titleColor: "#111815",
      descriptionColor: "#69716d",
      buttons: [{
        id: newId("button"),
        text: "",
        link: "",
        color: "#06c755",
        style: "primary",
      }],
    };
    setBuilder((current) => ({ ...current, cards: [...current.cards, card] }));
    setActiveCardId(card.id);
  };

  const moveCard = (direction: -1 | 1) => {
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= builder.cards.length) return;
    setBuilder((current) => {
      const cards = [...current.cards];
      [cards[activeIndex], cards[nextIndex]] = [cards[nextIndex], cards[activeIndex]];
      return { ...current, cards };
    });
  };

  const removeCard = () => {
    if (builder.cards.length === 1) return notify("至少保留一张卡片");
    if (!window.confirm(`确定删除第 ${activeIndex + 1} 张卡片吗？`)) return;
    const nextCards = builder.cards.filter((card) => card.id !== activeCard.id);
    setBuilder((current) => ({ ...current, cards: nextCards }));
    setActiveCardId(nextCards[Math.min(activeIndex, nextCards.length - 1)].id);
  };

  const addButton = () => {
    updateCard("buttons", [...activeCard.buttons, {
      id: newId("button"),
      text: "",
      link: "",
      color: "#06c755",
      style: "primary",
    }]);
  };

  const removeButton = (buttonId: string) => {
    updateCard("buttons", activeCard.buttons.filter((button) => button.id !== buttonId));
  };

  const moveButton = (buttonId: string, direction: -1 | 1) => {
    const buttonIndex = activeCard.buttons.findIndex((button) => button.id === buttonId);
    const nextIndex = buttonIndex + direction;
    if (buttonIndex < 0 || nextIndex < 0 || nextIndex >= activeCard.buttons.length) return;
    const buttons = [...activeCard.buttons];
    [buttons[buttonIndex], buttons[nextIndex]] = [buttons[nextIndex], buttons[buttonIndex]];
    updateCard("buttons", buttons);
  };

  const buttonPreviewStyle = (button: CardButton) => {
    if (button.style === "primary") return { background: button.color, color: "#ffffff", borderColor: button.color };
    if (button.style === "secondary") return { background: button.color, color: "#111815", borderColor: button.color };
    return { background: "transparent", color: button.color, borderColor: "transparent" };
  };

  const openLineCarousel = () => {
    window.history.pushState({}, "", "?template=custom-line-carousel");
    setShowEditor(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCatalog = () => {
    window.history.pushState({}, "", window.location.pathname);
    setShowEditor(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!showEditor || !account) return <TemplateCatalog onOpenLineCarousel={openLineCarousel} account={account} />;

  return (
    <main className="site-shell" id="top">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="LINE 卡片实验室首页">
          <span className="brand-mark">L</span>
          <span>LINE 卡片实验室</span>
        </a>
        <AccountActions account={account} />
      </header>

      <div className="editor-return-row">
        <button className="catalog-back" type="button" onClick={openCatalog}>← 返回样板列表</button>
        <div className="favorite-actions">
          <button className="favorite-save" type="button" disabled={savingFavorite} onClick={() => saveFavorite(false)}>{savingFavorite ? "保存中…" : activeFavoriteId ? "✓ 更新收藏" : "♡ 收藏卡片"}</button>
          {activeFavoriteId && <button type="button" disabled={savingFavorite} onClick={() => saveFavorite(true)}>＋ 另存为新收藏</button>}
          <button type="button" aria-expanded={favoritesOpen} onClick={() => setFavoritesOpen((open) => !open)}>我的收藏 {favorites.length ? `(${favorites.length})` : ""}</button>
        </div>
      </div>

      {favoritesOpen && (
        <section className="favorites-panel" aria-label="我的卡片收藏">
          <div className="favorites-heading"><div><small>SAVED CARDS</small><h2>我的收藏</h2></div><button type="button" aria-label="关闭我的收藏" onClick={() => setFavoritesOpen(false)}>×</button></div>
          {favoritesLoading ? <p className="favorites-empty">正在读取收藏…</p> : favorites.length ? (
            <div className="favorites-grid">
              {favorites.map((favorite) => (
                <article className={favorite.id === activeFavoriteId ? "favorite-item active" : "favorite-item"} key={favorite.id}>
                  <div className="favorite-thumb">{favorite.previewImage ? <img src={favorite.previewImage} alt="" /> : <span>LINE</span>}</div>
                  <div className="favorite-meta"><strong>{favorite.name}</strong><span>{new Date(favorite.updatedAt * 1000).toLocaleDateString("zh-CN")} 更新</span></div>
                  <div className="favorite-item-actions"><button type="button" onClick={() => loadFavorite(favorite.id)}>继续编辑</button><button className="favorite-delete" type="button" onClick={() => deleteFavorite(favorite)}>删除</button></div>
                </article>
              ))}
            </div>
          ) : <p className="favorites-empty">还没有收藏。编辑完成后点击“收藏卡片”即可保存。</p>}
        </section>
      )}

      <section className="workspace" aria-label="卡片编辑工作区">
        <div className="editor-panel">
          <div className="panel-heading">
            <div><span className="step">01</span><h2>编辑卡片</h2></div>
          </div>

          <div className="card-tabs" aria-label="卡片列表">
            {builder.cards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                className={card.id === activeCard.id ? "active" : ""}
                aria-pressed={card.id === activeCard.id}
                onClick={() => setActiveCardId(card.id)}
              >{String(index + 1).padStart(2, "0")}</button>
            ))}
            <button className="add-tab" type="button" onClick={addCard} aria-label="新增卡片">＋</button>
          </div>

          <section className="editor-section compact-section">
            <button className="section-toggle" type="button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}>
              <span><small>GLOBAL</small> 全局设置</span><b>{settingsOpen ? "−" : "+"}</b>
            </button>
            {settingsOpen && (
              <div className="section-content settings-grid">
                <label htmlFor="ratio"><span>图片比例</span><input id="ratio" value={builder.settings.ratio} onChange={(event) => updateSettings("ratio", event.target.value)} placeholder="20:13" /></label>
                <label htmlFor="chat-name"><span>预览聊天名称</span><input id="chat-name" value={builder.settings.chatName} onChange={(event) => updateSettings("chatName", event.target.value)} /></label>
                <label htmlFor="title-size"><span>标题字号</span><select id="title-size" value={builder.settings.titleSize} onChange={(event) => updateSettings("titleSize", event.target.value as FontSize)}>{FONT_SIZES.map((size) => <option key={size}>{size}</option>)}</select></label>
                <label htmlFor="desc-size"><span>说明字号</span><select id="desc-size" value={builder.settings.descriptionSize} onChange={(event) => updateSettings("descriptionSize", event.target.value as FontSize)}>{FONT_SIZES.map((size) => <option key={size}>{size}</option>)}</select></label>
                <label htmlFor="button-height"><span>按钮高度</span><select id="button-height" value={builder.settings.buttonHeight} onChange={(event) => updateSettings("buttonHeight", event.target.value as "sm" | "md")}><option value="sm">sm</option><option value="md">md</option></select></label>
              </div>
            )}
          </section>

          <section className="editor-section">
            <div className="card-toolbar">
              <div><small>CARD {String(activeIndex + 1).padStart(2, "0")}</small><strong>{activeCard.title || "未命名卡片"}</strong></div>
              <div className="icon-actions">
                <button type="button" onClick={() => moveCard(-1)} disabled={activeIndex === 0} aria-label="卡片前移">←</button>
                <button type="button" onClick={() => moveCard(1)} disabled={activeIndex === builder.cards.length - 1} aria-label="卡片后移">→</button>
                <button className="danger" type="button" onClick={removeCard} aria-label="删除卡片">×</button>
              </div>
            </div>

            <div className="section-content form-stack">
              <label htmlFor="card-title"><span>主标题</span><input id="card-title" value={activeCard.title} onChange={(event) => updateCard("title", event.target.value)} /></label>
              <label htmlFor="card-description"><span>说明文字</span><textarea id="card-description" rows={3} value={activeCard.description} onChange={(event) => updateCard("description", event.target.value)} /></label>
              <div className="image-upload-field">
                <span className="field-label">卡片图片</span>
                <input ref={imageInputRef} className="image-file-input" id="card-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} />
                <div className="image-source-options" role="radiogroup" aria-label="图片输入方式">
                  <label><input type="radio" name="image-source" value="upload" checked={imageSourceMode === "upload"} onChange={() => setImageSourceMode("upload")} /><span>上传图片</span></label>
                  <label><input type="radio" name="image-source" value="url" checked={imageSourceMode === "url"} onChange={() => setImageSourceMode("url")} /><span>输入链接</span></label>
                </div>
                {imageSourceMode === "upload" ? (
                  <div className="image-upload-control">
                    <div className="image-upload-thumb">
                      {activeCard.image ? <img key={activeCard.image} src={activeCard.image} alt="当前卡片图片" /> : <span>暂无图片</span>}
                    </div>
                    <div className="image-upload-actions">
                      <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}>{uploadingImage ? "上传中…" : activeCard.image ? "更换图片" : "选择图片"}</button>
                      {activeCard.image && <button className="remove-image" type="button" onClick={() => updateCard("image", "")} disabled={uploadingImage}>移除</button>}
                      <small>支持 JPG、PNG、WebP，最大 10MB</small>
                    </div>
                  </div>
                ) : (
                  <label className="image-url-input" htmlFor="card-image-url">
                    <span>图片链接（HTTPS）</span>
                    <input id="card-image-url" type="url" value={activeCard.image} onChange={(event) => {
                      updateCard("imageBackgroundColor", "");
                      updateCard("image", event.target.value);
                    }} placeholder="https://..." />
                  </label>
                )}
              </div>
              <div className="color-grid">
                {([
                  ["backgroundColor", "卡片底色"],
                  ["titleColor", "标题颜色"],
                  ["descriptionColor", "说明颜色"],
                ] as Array<["backgroundColor" | "titleColor" | "descriptionColor", string]>).map(([key, label]) => (
                  <label key={key} htmlFor={`color-${key}`}><span>{label}</span><span className="color-control"><input id={`color-${key}`} type="color" value={activeCard[key]} onChange={(event) => updateCard(key, event.target.value)} /><code>{activeCard[key]}</code></span></label>
                ))}
              </div>
            </div>
          </section>

          <section className="editor-section">
            <div className="subsection-heading"><div><small>ACTIONS</small><h3>卡片按钮</h3></div><button type="button" onClick={addButton}>＋ 新增按钮</button></div>
            <div className="button-list">
              {activeCard.buttons.length === 0 && <p className="empty-note">这张卡片还没有按钮。</p>}
              {activeCard.buttons.map((button, index) => (
                <div className="button-editor" key={button.id}>
                  <div className="button-editor-head">
                    <span>按钮 {index + 1}</span>
                    <div>
                      <button type="button" onClick={() => moveButton(button.id, -1)} disabled={index === 0}>上移</button>
                      <button type="button" onClick={() => moveButton(button.id, 1)} disabled={index === activeCard.buttons.length - 1}>下移</button>
                      <button className="delete-button" type="button" onClick={() => removeButton(button.id)}>删除</button>
                    </div>
                  </div>
                  <label htmlFor={`button-text-${button.id}`}><span>按钮文字</span><input id={`button-text-${button.id}`} value={button.text} onChange={(event) => updateButton(button.id, "text", event.target.value)} /></label>
                  <label htmlFor={`button-link-${button.id}`}><span>目标网址</span><input id={`button-link-${button.id}`} value={button.link} onChange={(event) => updateButton(button.id, "link", event.target.value)} /></label>
                  <div className="button-options">
                    <label htmlFor={`button-style-${button.id}`}><span>样式</span><select id={`button-style-${button.id}`} value={button.style} onChange={(event) => updateButton(button.id, "style", event.target.value as ButtonStyle)}><option value="primary">主按钮</option><option value="secondary">次按钮</option><option value="link">文字链接</option></select></label>
                    <label htmlFor={`button-color-${button.id}`}><span>颜色</span><span className="color-control"><input id={`button-color-${button.id}`} type="color" value={button.color} onChange={(event) => updateButton(button.id, "color", event.target.value)} /><code>{button.color}</code></span></label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="editor-section compact-section">
            <a
              className={`create-card-action ${account?.vip && !compatibilityLink ? "disabled" : ""}`}
              href={account?.vip ? (compatibilityLink || undefined) : "/account?returnTo=%2F%3Ftemplate%3Dcustom-line-carousel"}
              target={account?.vip ? "_blank" : undefined}
              rel={account?.vip ? "noreferrer" : undefined}
              aria-disabled={account?.vip ? !compatibilityLink : false}
            >
              <span><small>LINE</small>{account === undefined ? "读取账户…" : account.vip ? (compatibilityLink ? "分享卡片" : "正在准备卡片…") : "开通 VIP 后分享"}</span><b>↗</b>
            </a>
          </section>

        </div>

        <aside className="preview-panel">
          <div className="preview-sticky">
            <div className="panel-heading inverse">
              <div><span className="step">02</span><h2>LINE 实时预览</h2></div>
              <span className="card-count">输入即更新 · {activeIndex + 1} / {builder.cards.length}</span>
            </div>

            <div className="phone-stage">
              <div className="preview-orbit orbit-one" /><div className="preview-orbit orbit-two" />
              <div className="phone">
                <div className="phone-notch" />
                <div className="phone-header"><span>‹</span><b>{builder.settings.chatName || "LINE"}</b><span>⋯</span></div>
                <div className="chat-time">今天 10:24</div>
                <article className="line-card" style={{ background: activeCard.backgroundColor }}>
                  <div className="card-visual" style={{ aspectRatio: builder.settings.ratio.replace(":", " / "), backgroundColor: activeCard.imageBackgroundColor || activeCard.backgroundColor }}>
                    {activeCard.image && <>
                      <img className="visual-backdrop" key={`${activeCard.image}-backdrop`} src={activeCard.image} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                      <img className="visual-main" key={activeCard.image} src={activeCard.image} alt="" onLoad={(event) => {
                        event.currentTarget.style.display = "block";
                        try {
                          const color = imageEdgeColor(event.currentTarget);
                          if (color && color !== activeCard.imageBackgroundColor) updateCard("imageBackgroundColor", color);
                        } catch {
                          // Some external sample images don't allow canvas sampling.
                        }
                      }} onError={(event) => { event.currentTarget.style.display = "none"; }} />
                    </>}
                    <div className="visual-fallback"><small>{String(activeIndex + 1).padStart(2, "0")}</small></div>
                  </div>
                  <div className="card-body">
                    <h3 style={{ color: activeCard.titleColor }}>{activeCard.title}</h3>
                    <p style={{ color: activeCard.descriptionColor }}>{activeCard.description}</p>
                    <div className="preview-buttons">
                      {activeCard.buttons.map((button) => <button key={button.id} type="button" style={buttonPreviewStyle(button)}>{button.text}</button>)}
                    </div>
                  </div>
                </article>
                <div className="pager-dots" aria-label="选择预览卡片">
                  {builder.cards.map((card) => <button key={card.id} type="button" className={card.id === activeCard.id ? "active" : ""} onClick={() => setActiveCardId(card.id)} aria-label={`预览第 ${builder.cards.indexOf(card) + 1} 张卡片`} />)}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <div className={`toast ${toast ? "show" : ""}`} role="status">{toast}</div>
    </main>
  );
}
