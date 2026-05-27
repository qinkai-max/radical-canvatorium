import type { Ref } from "vue";
import { onMounted, onUnmounted } from "vue";
import { ArcRotateCamera, Scene, Engine, Vector3, Color3, Color4, MeshBuilder, HemisphericLight, GroundMesh, Tools, Camera, WebXRDefaultExperience } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock, StackPanel, Control, Button, Rectangle } from "@babylonjs/gui";
import { GridMaterial } from "@babylonjs/materials";
// Enable GLTF/GLB loader for loading controller models from WebXR Input registry
import "@babylonjs/loaders/glTF";

// Without this next import, an error message like this occurs loading controller models:
//  Build of NodeMaterial failed" error when loading controller model
//  Uncaught (in promise) Build of NodeMaterial failed: input rgba from block
//  FragmentOutput[FragmentOutputBlock] is not connected and is not optional.
import "@babylonjs/core/Materials/Node/Blocks";

interface LabSceneOptions { // 场景配置项，所有字段都是可选的，用于定制场景功能；
  useCamera?: boolean;      // 是否创建默认相机
  useLights?: boolean;      // 是否创建默认灯光
  useRoom?: boolean;        // 是否创建默认房间
  useOverlay?: boolean;     // 是否创建默认覆盖层
  useWebXRPlayer?: boolean; // 是否创建默认WebXR玩家
}

// create a type that can be WebXRDefaultExperience or null
type WebXRDefaultExperienceOrNull = Promise<WebXRDefaultExperience> | null;

// 创建场景组合函数：
// 入参：
// bjsCanvas: Vue 的 Ref 对象，指向渲染 3D 场景的 Canvas DOM 元素
// createLabContent: 回调函数，接收场景和WebXR默认体验（可选）允许外部注入自定义 3D 内容到场景中
// options: 场景配置项，所有字段都是可选的，用于定制场景功能
// 该函数负责创建 Babylon.js 场景、相机、灯光、房间、覆盖层、WebXR玩家等元素
export const useCanvatoriumScene = (
  bjsCanvas: Ref<HTMLCanvasElement | null>,
  createLabContent: (scene: Scene, xr: WebXRDefaultExperienceOrNull) => void,
  options?: LabSceneOptions
 ) => {
  let engine: Engine | null = null;

  // 处理窗口大小变化，确保场景自适应
  const handleResize = () => {
    if (engine) {
      engine.resize();
    }
  };

  // Vue挂载钩子：canvas挂载后,调用核心函数createLabScene来创建场景,同时绑定事件监听
  onMounted(() => {
    if (bjsCanvas.value) {
      const { engine: createdEngine } = createLabScene(bjsCanvas.value, createLabContent, options);
      engine = createdEngine;
      window.addEventListener("resize", handleResize);
    }
  });

  // Vue卸载钩子：销毁场景、移除事件监听
  onUnmounted(() => {
    if (engine) {
      engine.dispose();
    }
    window.removeEventListener("resize", handleResize);
  });
};

// 函数（场景创建核心）：创建场景、相机、灯光、房间、覆盖层、WebXR玩家等元素
const createLabScene = (canvas: HTMLCanvasElement, createLabContent: (scene: Scene, xr: WebXRDefaultExperienceOrNull) => void, options?: LabSceneOptions) => {
  // 1. 初始化引擎和场景
  const engine = new Engine(canvas);
  const scene = new Scene(engine);

  // 2. 合并默认选项和用户选项
  const defaultOptions: LabSceneOptions = {
    useCamera: true,
    useLights: true,
    useRoom: true,
    useOverlay: true,
    useWebXRPlayer: true
  };
  const mergedOptions = { ...defaultOptions, ...options };

  // 3. 按需创建场景元素
  let teleportMeshes: GroundMesh[] = [];
  if (mergedOptions.useCamera) labCreateCamera(canvas, scene);
  if (mergedOptions.useRoom) teleportMeshes.push(labCreateRoom(scene));
  if (mergedOptions.useLights) labCreateLights(scene);

  // 4. 按需创建覆盖层（用于显示WebXR提示）
  if (mergedOptions.useOverlay) labCreateOverlay(scene, engine);

  // 5. 按需创建WebXR玩家（用于启用WebXR功能，依赖房间的地面用于瞬移功能）
  let xr: WebXRDefaultExperienceOrNull = null;
  if (mergedOptions.useWebXRPlayer && teleportMeshes.length > 0) {
    xr = labCreateWebXRPlayer(scene, teleportMeshes);
  }

  // 6. 调用外部回调函数创建场景内容，注入外部自定义内容
  createLabContent(scene, xr);

  // 8. 启动渲染循环
  engine.runRenderLoop(() => {
    scene.render();
  });

  // 9. 处理窗口大小变化，确保场景自适应
  window.addEventListener("resize", () => {
    engine.resize();
  });

  // 10. 返回创建的引擎和场景实例，供外部扩展
  return {
    engine,
    scene
  };
};

// 函数（创建相机）：创建场景中的相机，用于观察场景
const labCreateCamera = (canvas: HTMLCanvasElement, scene: Scene) => {
  // 1. 创建弧旋转相机（非XR模式下，可绕目标旋转/缩放）
  const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 3, new Vector3(0, 0, 0), scene);
  // 相机配置：滚轮缩放速度、旋转限制、距离限制
  camera.wheelDeltaPercentage = 0.01;
  camera.upperBetaLimit = Math.PI / 1.5; // 垂直旋转上限
  camera.lowerRadiusLimit = 2; // 最近距离
  camera.upperRadiusLimit = 10; // 最远距离 
  camera.setPosition(new Vector3(0, 1.5, -6)); // 初始位置
  camera.setTarget(new Vector3(0, 1, 0)); // 初始看向目标位置
  camera.attachControl(canvas, true); // 使相机响应鼠标事件
};

// 函数（创建房间）：创建场景中的房间，用于放置场景元素
const labCreateRoom = (scene: Scene) => {
  // 1. 创建地面（用于XR瞬移）
  const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);

  // 2. 创建网格材质（地面/墙壁样式）
  const groundMaterial = new GridMaterial("ground-mat", scene);
  groundMaterial.majorUnitFrequency = 5;
  groundMaterial.gridRatio = 1;
  groundMaterial.backFaceCulling = false;
  groundMaterial.lineColor = Color3.FromHexString(labColors.slate8);
  groundMaterial.mainColor = Color3.FromHexString(labColors.slate7);
  groundMaterial.opacity = 0.98;

  // 3. 地面绑定材质
  ground.material = groundMaterial;

  // 4. 创建房间的4面墙（相同材质）
  const wall1 = MeshBuilder.CreatePlane("wall1", { width: 20, height: 10 }, scene);
  wall1.position = new Vector3(-10, 5, 0);
  wall1.rotation.y = Math.PI / 2;
  wall1.material = groundMaterial;

  const wall2 = MeshBuilder.CreatePlane("wall2", { width: 20, height: 10 }, scene);
  wall2.position = new Vector3(0, 5, 10);
  wall2.rotation.y = Math.PI;
  wall2.material = groundMaterial;

  const wall3 = MeshBuilder.CreatePlane("wall3", { width: 20, height: 10 }, scene);
  wall3.position = new Vector3(10, 5, 0);
  wall3.rotation.y = -Math.PI / 2;
  wall3.material = groundMaterial;

  const wall4 = MeshBuilder.CreatePlane("wall4", { width: 20, height: 10 }, scene);
  wall4.position = new Vector3(0, 5, -10);
  wall4.material = groundMaterial;

  // 5. 返回地面（用于XR瞬移）
  return ground;
};

// 函数（创建灯光）：创建场景中的灯光，用于照亮场景
const labCreateLights = (scene: Scene) => {
  // Customize the scene lighting and background color
  const ambientLight1 = new HemisphericLight("light-01", new Vector3(5, 5, 5), scene);
  ambientLight1.intensity = 0.8;
  const ambientLight2 = new HemisphericLight("light-02", new Vector3(-5, 5, -5), scene);
  ambientLight2.intensity = 0.8;
  // set the scene color to
  scene.clearColor = Color4.FromHexString(labColors.slate1);
};

// 依赖房间的地面用于瞬移功能
// 函数（创建WebXR玩家）：创建场景中的WebXR玩家，用于启用WebXR功能，依赖房间的地面用于瞬移功能
const labCreateWebXRPlayer = async (scene: Scene, teleportMeshes: GroundMesh[]) => {
  const xr = await scene.createDefaultXRExperienceAsync({
    floorMeshes: teleportMeshes
  });

  if (window) {
    // could be undefined in SSR
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        xr.baseExperience.exitXRAsync();
      }
    });
  }

  return xr;
};

// 函数（创建覆盖层）：为场景添加一个全屏的覆盖层，用于显示标题和代码链接
const labCreateOverlay = (scene: Scene, engine: Engine) => {
  const route = useRoute();
  // Force these to be strings
  // 1. 确保标题文本为字符串
  const titleText: string = (route.meta.title ?? "Canvatorium").toString();

  // 2. 创建一个全屏的UI纹理（用于显示标题和代码链接）
  const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("lab-overlay", true, scene);

  const title = new TextBlock();
  title.text = titleText;
  title.color = "white";
  title.fontSize = "16px";
  title.fontWeight = "bold";
  title.textWrapping = true;
  title.paddingTop = "10px";
  title.paddingBottom = "10px";
  title.paddingLeft = "12px";
  title.paddingRight = "12px";
  title.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

  // add a background to the title
  const titleBackground = new Rectangle();
  titleBackground.width = "100%";
  titleBackground.height = "40px";
  titleBackground.background = labColors.slate8;
  titleBackground.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

  const codeLinkLabel = new TextBlock();
  codeLinkLabel.text = "<Code />";
  codeLinkLabel.color = "white";
  codeLinkLabel.fontSize = 14;
  codeLinkLabel.paddingTop = "5px";

  // 3. 创建代码链接按钮
  const codeLink = new Button();
  codeLink.width = "120px";
  codeLink.height = "60px";
  codeLink.color = "white";
  codeLink.background = labColors.slate8;
  codeLink.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  codeLink.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  codeLink.left = "100px";
  codeLink.paddingTop = "10px";
  codeLink.paddingBottom = "10px";
  codeLink.paddingLeft = "12px";
  codeLink.paddingRight = "12px";
  codeLink.cornerRadius = 5;
  codeLink.thickness = 2;
  codeLink.addControl(codeLinkLabel);

  codeLink.onPointerClickObservable.add(() => {
    // Open the code on GitHub in the main branch.
    // This isn't perfect, but it's a start. It should work for everything in the pages directory.
    const baseURL = "https://github.com/radicalappdev/radical-canvatorium/blob/main-02/pages";
    const labPath = route.path + ".vue";
    const target = baseURL + labPath;
    window.open(target, "_blank");
  });

  // set window title
  window.document.title = titleText;

  const buttonScreenshotLabel = new TextBlock();
  buttonScreenshotLabel.text = "Screenshot";
  buttonScreenshotLabel.color = "white";
  buttonScreenshotLabel.fontSize = 14;
  buttonScreenshotLabel.paddingTop = "5px";

  // 4. 创建截图按钮
  const buttonScreenshot = new Button();
  buttonScreenshot.width = "120px";
  buttonScreenshot.height = "60px";
  buttonScreenshot.color = "white";
  buttonScreenshot.background = labColors.slate8;
  buttonScreenshot.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  buttonScreenshot.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  buttonScreenshot.paddingTop = "10px";
  buttonScreenshot.paddingBottom = "10px";
  buttonScreenshot.paddingLeft = "12px";
  buttonScreenshot.paddingRight = "12px";
  buttonScreenshot.cornerRadius = 5;
  buttonScreenshot.thickness = 2;
  buttonScreenshot.addControl(buttonScreenshotLabel);

  buttonScreenshot.onPointerClickObservable.add(() => {
    buttonScreenshot.isVisible = false;
    titleBackground.isVisible = false;
    title.isVisible = false;
    codeLink.isVisible = false;

    const size = {
      width: engine.getRenderWidth() * 2,
      height: engine.getRenderHeight() * 2
    };
    const currentCamera = scene.activeCamera;
    if (currentCamera) {
      const screenshot = Tools.CreateScreenshot(engine, currentCamera, size);
      console.log("screenshot created", screenshot);
    }
    // wait a few frames for the screenshot to be created before showing the button again
    setTimeout(() => {
      buttonScreenshot.isVisible = true;
      titleBackground.isVisible = true;
      title.isVisible = true;
      codeLink.isVisible = true;
    }, 100);
  });

  // 5. 将所有UI控件添加到纹理
  advancedTexture.addControl(titleBackground);
  advancedTexture.addControl(title);
  advancedTexture.addControl(codeLink);
  advancedTexture.addControl(buttonScreenshot);
};
