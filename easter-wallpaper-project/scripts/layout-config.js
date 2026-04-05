(function () {
  const DEFAULT_LAYOUT_PATH = "layout.json";

  const DEFAULT_TEMPLATES = {
    egg: {
      type: "egg",
      asset: "assets/easter/egg-pink.svg",
      x: 50,
      y: 70,
      scale: 13,
      rotation: 0,
      z: 4,
      hidden: false,
      linkedId: ""
    },
    bunny: {
      type: "bunny",
      asset: "assets/easter/bunny.svg",
      x: 50,
      y: 64,
      scale: 16,
      rotation: 0,
      z: 3,
      hidden: true,
      linkedId: ""
    },
    decoration: {
      type: "decoration",
      asset: "assets/easter/flower.svg",
      x: 50,
      y: 78,
      scale: 10,
      rotation: 0,
      z: 2,
      hidden: false,
      linkedId: ""
    }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createId(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 8);
  }

  function normalizeObject(raw, index) {
    const fallback = DEFAULT_TEMPLATES[raw.type] || DEFAULT_TEMPLATES.decoration;
    return {
      id: raw.id || createId(raw.type || "item"),
      name: raw.name || `${raw.type || "object"} ${index + 1}`,
      type: raw.type || "decoration",
      asset: raw.asset || fallback.asset,
      x: clamp(Number(raw.x ?? fallback.x), 0, 100),
      y: clamp(Number(raw.y ?? fallback.y), 0, 100),
      scale: clamp(Number(raw.scale ?? fallback.scale), 1, 60),
      rotation: clamp(Number(raw.rotation ?? fallback.rotation), -180, 180),
      z: Number.isFinite(Number(raw.z)) ? Number(raw.z) : fallback.z,
      hidden: Boolean(raw.hidden),
      linkedId: raw.linkedId || ""
    };
  }

  function normalizeLayout(raw) {
    return {
      version: 1,
      title: raw?.title || "イースターたまご探し",
      background: raw?.background || "assets/real/background.jpg",
      storageKey: raw?.storageKey || "easter-egg-hunt-layout",
      sceneRatio: raw?.sceneRatio || "9 / 16",
      objects: Array.isArray(raw?.objects) ? raw.objects.map(normalizeObject) : []
    };
  }

  function sortObjects(objects) {
    return [...objects].sort((a, b) => a.z - b.z);
  }

  async function loadLayout(path = DEFAULT_LAYOUT_PATH) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("layout.json の読み込みに失敗しました");
    }
    return normalizeLayout(await response.json());
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function objectToStyle(object) {
    return {
      left: `${object.x}%`,
      top: `${object.y}%`,
      width: `${object.scale}%`,
      transform: `translate(-50%, -50%) rotate(${object.rotation}deg)`,
      zIndex: String(object.z)
    };
  }

  window.EasterLayout = {
    DEFAULT_LAYOUT_PATH,
    DEFAULT_TEMPLATES,
    clamp,
    createId,
    normalizeLayout,
    normalizeObject,
    sortObjects,
    loadLayout,
    downloadJson,
    objectToStyle
  };
})();
