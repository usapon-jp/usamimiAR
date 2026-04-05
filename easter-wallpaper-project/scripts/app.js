(function () {
  const scene = document.getElementById("scene");
  const sceneFrame = scene.parentElement;
  const progressText = document.getElementById("progressText");
  const saveImageButton = document.getElementById("saveImageButton");
  const resetButton = document.getElementById("resetButton");
  const toast = document.getElementById("toast");
  const storage = window.localStorage;
  const resetOnLoad = document.body.dataset.resetOnLoad === "true";

  const { loadLayout, sortObjects, objectToStyle } = window.EasterLayout;

  let layout;
  let foundEggs = {};
  let toastTimer = 0;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }

  function getStorageKey() {
    return `${layout.storageKey}:found`;
  }

  function readFoundState() {
    try {
      return JSON.parse(storage.getItem(getStorageKey()) || "{}");
    } catch (error) {
      return {};
    }
  }

  function saveFoundState() {
    storage.setItem(getStorageKey(), JSON.stringify(foundEggs));
  }

  function getObjectById(id) {
    return layout.objects.find((item) => item.id === id);
  }

  function isObjectVisible(item) {
    if (item.type === "egg" && foundEggs[item.id]) {
      return false;
    }
    if (!item.hidden) {
      return true;
    }
    if (item.type !== "bunny") {
      return false;
    }
    return layout.objects.some((egg) => egg.type === "egg" && egg.linkedId === item.id && foundEggs[egg.id]);
  }

  function createObjectElement(item) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = `scene-object is-${item.type}`;
    element.dataset.id = item.id;
    element.innerHTML = `<img src="${item.asset}" alt="">`;
    Object.assign(element.style, objectToStyle(item));

    if (item.type !== "egg") {
      element.disabled = true;
      element.setAttribute("aria-hidden", "true");
    } else {
      element.setAttribute("aria-label", `${item.name} をひらく`);
    }

    if (!isObjectVisible(item)) {
      element.classList.add("is-hidden");
    }

    return element;
  }

  function updateProgress() {
    const eggs = layout.objects.filter((item) => item.type === "egg");
    const foundCount = eggs.filter((item) => foundEggs[item.id]).length;
    progressText.textContent = `${foundCount} / ${eggs.length} 個みつけたよ`;
  }

  function renderScene() {
    scene.innerHTML = "";
    scene.style.backgroundImage = `url("${layout.background}")`;
    sceneFrame.style.setProperty("--scene-ratio", layout.sceneRatio || "9 / 16");
    sortObjects(layout.objects).forEach((item) => scene.appendChild(createObjectElement(item)));
    updateProgress();
  }

  function revealLinkedBunny(egg) {
    if (!egg.linkedId) {
      return;
    }
    const bunny = getObjectById(egg.linkedId);
    const bunnyElement = bunny ? scene.querySelector(`[data-id="${bunny.id}"]`) : null;
    if (bunnyElement) {
      bunnyElement.classList.remove("is-hidden");
    }
  }

  scene.addEventListener("click", (event) => {
    const target = event.target.closest(".scene-object.is-egg");
    if (!target) {
      return;
    }

    const egg = getObjectById(target.dataset.id);
    if (!egg || foundEggs[egg.id]) {
      return;
    }

    foundEggs[egg.id] = true;
    saveFoundState();
    target.classList.add("is-hidden");
    revealLinkedBunny(egg);
    updateProgress();
    showToast("うさぎさん発見！");
  });

  async function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`${src} を読み込めませんでした`));
      image.src = src;
    });
  }

  async function savePng() {
    const background = await loadImage(layout.background);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = background.naturalWidth;
    canvas.height = background.naturalHeight;
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    for (const item of sortObjects(layout.objects)) {
      if (!isObjectVisible(item)) {
        continue;
      }
      const image = await loadImage(item.asset);
      const drawWidth = canvas.width * (item.scale / 100);
      const drawHeight = drawWidth * (image.naturalHeight / image.naturalWidth);
      const centerX = canvas.width * (item.x / 100);
      const centerY = canvas.height * (item.y / 100);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `easter-egg-hunt-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
    link.click();
    showToast("PNG を保存しました");
  }

  saveImageButton.addEventListener("click", async () => {
    try {
      await savePng();
    } catch (error) {
      showToast(error.message);
    }
  });

  resetButton.addEventListener("click", () => {
    foundEggs = {};
    storage.removeItem(getStorageKey());
    renderScene();
    showToast("開封状態をリセットしました");
  });

  async function init() {
    try {
      layout = await loadLayout();
      if (resetOnLoad) {
        storage.removeItem(getStorageKey());
      }
      foundEggs = readFoundState();
      renderScene();
    } catch (error) {
      progressText.textContent = error.message;
    }
  }

  init();
})();
