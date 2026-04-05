(function () {
  const scene = document.getElementById("editorScene");
  const sceneFrame = scene.parentElement;
  const objectList = document.getElementById("objectList");
  const toast = document.getElementById("toast");
  const fileInput = document.getElementById("fileInput");
  const emptyState = document.getElementById("emptyState");
  const inspectorFields = document.getElementById("inspectorFields");

  const nameInput = document.getElementById("nameInput");
  const assetInput = document.getElementById("assetInput");
  const linkedIdInput = document.getElementById("linkedIdInput");
  const xInput = document.getElementById("xInput");
  const yInput = document.getElementById("yInput");
  const scaleInput = document.getElementById("scaleInput");
  const rotationInput = document.getElementById("rotationInput");
  const zInput = document.getElementById("zInput");
  const hiddenInput = document.getElementById("hiddenInput");

  const {
    DEFAULT_TEMPLATES,
    clamp,
    createId,
    normalizeLayout,
    normalizeObject,
    sortObjects,
    loadLayout,
    downloadJson,
    objectToStyle
  } = window.EasterLayout;

  let layout;
  let selectedId = "";
  let toastTimer = 0;
  const gesture = {
    pointers: new Map(),
    activeId: "",
    startObject: null,
    startCenter: null,
    startDistance: 0,
    startAngle: 0
  };

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }

  function getSelectedObject() {
    return layout.objects.find((item) => item.id === selectedId) || null;
  }

  function selectObject(id) {
    selectedId = id;
    renderAll();
  }

  function updateInspector() {
    const selected = getSelectedObject();
    const hasSelected = Boolean(selected);
    emptyState.classList.toggle("hidden", hasSelected);
    inspectorFields.classList.toggle("hidden", !hasSelected);
    if (!selected) {
      return;
    }

    nameInput.value = selected.name;
    assetInput.value = selected.asset;
    linkedIdInput.value = selected.linkedId;
    xInput.value = selected.x.toFixed(1);
    yInput.value = selected.y.toFixed(1);
    scaleInput.value = selected.scale.toFixed(1);
    rotationInput.value = selected.rotation.toFixed(0);
    zInput.value = String(selected.z);
    hiddenInput.checked = selected.hidden;
  }

  function renderList() {
    objectList.innerHTML = "";
    sortObjects(layout.objects).forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "object-chip";
      if (item.id === selectedId) {
        button.classList.add("is-active");
      }
      button.dataset.id = item.id;
      button.innerHTML = `<strong>${item.name}</strong><span>${item.type} / ${item.id}</span>`;
      objectList.appendChild(button);
    });
  }

  function createObjectElement(item) {
    const element = document.createElement("div");
    element.className = `scene-object is-${item.type}`;
    element.dataset.id = item.id;
    element.innerHTML = `<img src="${item.asset}" alt="">`;
    Object.assign(element.style, objectToStyle(item));
    if (item.hidden) {
      element.classList.add("is-hidden");
    }
    if (item.id === selectedId) {
      element.classList.add("is-selected");
    }
    return element;
  }

  function renderScene() {
    scene.innerHTML = "";
    scene.style.backgroundImage = `url("${layout.background}")`;
    sceneFrame.style.setProperty("--scene-ratio", layout.sceneRatio || "9 / 16");
    sortObjects(layout.objects).forEach((item) => scene.appendChild(createObjectElement(item)));
  }

  function renderAll() {
    renderScene();
    renderList();
    updateInspector();
  }

  function updateSelected(patch) {
    const selected = getSelectedObject();
    if (!selected) {
      return;
    }
    Object.assign(selected, patch);
    renderAll();
  }

  function addObject(type) {
    const base = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES[type]));
    base.id = createId(type);
    base.name = `${type}-${layout.objects.filter((item) => item.type === type).length + 1}`;

    if (type === "egg") {
      const bunnyId = createId("bunny");
      base.linkedId = bunnyId;
      layout.objects.push(normalizeObject(base, layout.objects.length));
      layout.objects.push(normalizeObject({
        ...DEFAULT_TEMPLATES.bunny,
        id: bunnyId,
        name: `bunny-${layout.objects.filter((item) => item.type === "bunny").length + 1}`,
        x: base.x,
        y: base.y - 8,
        hidden: true
      }, layout.objects.length + 1));
      selectObject(base.id);
      showToast("たまごとうさぎを追加しました");
      return;
    }

    layout.objects.push(normalizeObject(base, layout.objects.length));
    selectObject(base.id);
    showToast(`${type} を追加しました`);
  }

  function deleteSelected() {
    const selected = getSelectedObject();
    if (!selected) {
      return;
    }

    layout.objects = layout.objects.filter((item) => item.id !== selected.id);
    if (selected.type === "egg" && selected.linkedId) {
      layout.objects = layout.objects.filter((item) => item.id !== selected.linkedId);
    }
    layout.objects.forEach((item) => {
      if (item.linkedId === selected.id) {
        item.linkedId = "";
      }
    });

    selectedId = "";
    renderAll();
    showToast("削除しました");
  }

  function duplicateSelected() {
    const selected = getSelectedObject();
    if (!selected) {
      return;
    }
    const duplicated = normalizeObject({
      ...selected,
      id: createId(selected.type),
      name: `${selected.name}-copy`,
      x: clamp(selected.x + 4, 0, 100),
      y: clamp(selected.y + 4, 0, 100),
      linkedId: selected.type === "egg" ? "" : selected.linkedId
    }, layout.objects.length);
    layout.objects.push(duplicated);
    selectObject(duplicated.id);
    showToast("複製しました");
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("ファイルを読めませんでした"));
      reader.readAsText(file, "utf-8");
    });
  }

  function scenePoint(clientX, clientY) {
    const rect = scene.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100
    };
  }

  function setGestureSnapshot(object) {
    gesture.startObject = {
      x: object.x,
      y: object.y,
      scale: object.scale,
      rotation: object.rotation
    };
  }

  function beginSinglePointerMove(object, pointer) {
    gesture.activeId = object.id;
    gesture.pointers.clear();
    gesture.pointers.set(pointer.pointerId, pointer);
    setGestureSnapshot(object);
    gesture.startCenter = scenePoint(pointer.clientX, pointer.clientY);
  }

  function beginMultiPointerGesture(object) {
    const pointers = [...gesture.pointers.values()];
    if (pointers.length < 2) {
      return;
    }
    gesture.activeId = object.id;
    setGestureSnapshot(object);
    const first = scenePoint(pointers[0].clientX, pointers[0].clientY);
    const second = scenePoint(pointers[1].clientX, pointers[1].clientY);
    gesture.startCenter = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    gesture.startDistance = Math.hypot(second.x - first.x, second.y - first.y);
    gesture.startAngle = Math.atan2(second.y - first.y, second.x - first.x);
  }

  function updateGesture() {
    const selected = getSelectedObject();
    if (!selected || selected.id !== gesture.activeId) {
      return;
    }

    const pointers = [...gesture.pointers.values()];
    if (pointers.length === 1 && gesture.startCenter && gesture.startObject) {
      const current = scenePoint(pointers[0].clientX, pointers[0].clientY);
      updateSelected({
        x: clamp(gesture.startObject.x + (current.x - gesture.startCenter.x), 0, 100),
        y: clamp(gesture.startObject.y + (current.y - gesture.startCenter.y), 0, 100)
      });
      return;
    }

    if (pointers.length >= 2 && gesture.startObject) {
      const first = scenePoint(pointers[0].clientX, pointers[0].clientY);
      const second = scenePoint(pointers[1].clientX, pointers[1].clientY);
      const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const angle = Math.atan2(second.y - first.y, second.x - first.x);
      updateSelected({
        x: clamp(gesture.startObject.x + (center.x - gesture.startCenter.x), 0, 100),
        y: clamp(gesture.startObject.y + (center.y - gesture.startCenter.y), 0, 100),
        scale: clamp(gesture.startObject.scale * (gesture.startDistance ? distance / gesture.startDistance : 1), 1, 60),
        rotation: clamp(gesture.startObject.rotation + (((angle - gesture.startAngle) * 180) / Math.PI), -180, 180)
      });
    }
  }

  function resetGesture(pointerId) {
    gesture.pointers.delete(pointerId);
    if (!gesture.pointers.size) {
      gesture.activeId = "";
      gesture.startObject = null;
      gesture.startCenter = null;
      gesture.startDistance = 0;
      gesture.startAngle = 0;
      return;
    }
    const selected = getSelectedObject();
    if (selected) {
      beginMultiPointerGesture(selected);
    }
  }

  objectList.addEventListener("click", (event) => {
    const chip = event.target.closest(".object-chip");
    if (chip) {
      selectObject(chip.dataset.id);
    }
  });

  scene.addEventListener("pointerdown", (event) => {
    const target = event.target.closest(".scene-object");
    if (!target) {
      selectObject("");
      return;
    }

    event.preventDefault();
    scene.setPointerCapture(event.pointerId);
    selectObject(target.dataset.id);
    const selected = getSelectedObject();
    if (!selected) {
      return;
    }

    gesture.pointers.set(event.pointerId, event);
    if (gesture.pointers.size === 1) {
      beginSinglePointerMove(selected, event);
    } else {
      beginMultiPointerGesture(selected);
    }
  });

  scene.addEventListener("pointermove", (event) => {
    if (!gesture.pointers.has(event.pointerId)) {
      return;
    }
    event.preventDefault();
    gesture.pointers.set(event.pointerId, event);
    updateGesture();
  });

  function releasePointer(event) {
    if (gesture.pointers.has(event.pointerId)) {
      resetGesture(event.pointerId);
    }
  }

  scene.addEventListener("pointerup", releasePointer);
  scene.addEventListener("pointercancel", releasePointer);

  document.querySelectorAll("[data-add-type]").forEach((button) => {
    button.addEventListener("click", () => addObject(button.dataset.addType));
  });

  document.getElementById("duplicateButton").addEventListener("click", duplicateSelected);
  document.getElementById("deleteButton").addEventListener("click", deleteSelected);
  document.getElementById("rotateLeftButton").addEventListener("click", () => {
    const selected = getSelectedObject();
    if (selected) {
      updateSelected({ rotation: clamp(selected.rotation - 15, -180, 180) });
    }
  });
  document.getElementById("rotateRightButton").addEventListener("click", () => {
    const selected = getSelectedObject();
    if (selected) {
      updateSelected({ rotation: clamp(selected.rotation + 15, -180, 180) });
    }
  });

  [
    [nameInput, "name", (value) => value],
    [assetInput, "asset", (value) => value],
    [linkedIdInput, "linkedId", (value) => value],
    [xInput, "x", (value) => clamp(Number(value), 0, 100)],
    [yInput, "y", (value) => clamp(Number(value), 0, 100)],
    [scaleInput, "scale", (value) => clamp(Number(value), 1, 60)],
    [rotationInput, "rotation", (value) => clamp(Number(value), -180, 180)],
    [zInput, "z", (value) => Number(value)]
  ].forEach(([input, key, transform]) => {
    input.addEventListener("input", () => updateSelected({ [key]: transform(input.value) }));
  });

  hiddenInput.addEventListener("change", () => updateSelected({ hidden: hiddenInput.checked }));

  document.getElementById("saveButton").addEventListener("click", () => {
    downloadJson("layout.json", {
      version: layout.version,
      title: layout.title,
      background: layout.background,
      storageKey: layout.storageKey,
      objects: sortObjects(layout.objects)
    });
    showToast("layout.json を保存しました");
  });

  document.getElementById("loadFileButton").addEventListener("click", () => fileInput.click());
  document.getElementById("loadCurrentButton").addEventListener("click", async () => {
    layout = await loadLayout();
    selectedId = "";
    renderAll();
    showToast("現在の layout.json を読み込みました");
  });

  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files;
    if (!file) {
      return;
    }

    try {
      layout = normalizeLayout(JSON.parse(await readFile(file)));
      selectedId = "";
      renderAll();
      showToast("JSON を読み込みました");
    } catch (error) {
      showToast(error.message);
    } finally {
      fileInput.value = "";
    }
  });

  async function init() {
    layout = await loadLayout();
    renderAll();
  }

  init().catch((error) => showToast(error.message));
})();
