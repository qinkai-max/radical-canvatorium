<script lang="ts" setup>
  import { Scene, Mesh, Color3, StandardMaterial, MeshBuilder, Vector3, WebXRDefaultExperience } from "@babylonjs/core";
  import { GUI3DManager, HolographicButton } from "@babylonjs/gui";

  definePageMeta({
    featured: false,
    title: "Lab 003 - 默认的 XR 体验",
    description: "使用 Babylon JS 中的默认 XR 体验",
    labNotes: `使用默认 XR 体验时，玩家会自动移动到紫色的落地点。- 控制器输入示例：使用控制器上的触发器缩放盒子`
  });

  // 创建场景内容
  const createLabContent = async (scene: Scene, xr: Promise<WebXRDefaultExperience> | null) => {
    // 等待 XR 体验创建完成
    const xrExperience = await xr;

    //1. 创建紫色的落地点，用于玩家的传送点
    const purple = new StandardMaterial("purple", scene);
    purple.diffuseColor = Color3.FromHexString(labColors.purple);

    const landing = MeshBuilder.CreateCylinder("cylinder", { diameter: 1, height: 0.2 }, scene);
    landing.position = new Vector3(2, 0.1, 3);
    landing.material = purple;

    // 监听玩家进入沉浸式模式时的事件，将玩家移动到紫色的落地点
    xrExperience?.baseExperience.onInitialXRPoseSetObservable.add((xrCamera) => {
      xrCamera.position.z = landing.position.z;
      xrCamera.position.x = landing.position.x;
    });

    // Demo 2: Controller input. Scale these boxes with the triggers on the controllers
    //2. 创建两个盒子，用于演示控制器输入
    const cyan = new StandardMaterial("cyan", scene);
    cyan.diffuseColor = Color3.FromHexString(labColors.cyan);
    const box1 = MeshBuilder.CreateBox("box", { size: 0.8 }, scene);
    box1.position = new Vector3(1.5, 1, 5);
    box1.material = cyan;

    const box2 = MeshBuilder.CreateBox("box", { size: 0.8 }, scene);
    box2.position = new Vector3(2.5, 1, 5);
    box2.material = cyan;

    // 2. 初始化3D GUI管理器
    const gui3DManager = new GUI3DManager(scene);
    const enterVRBtn = new HolographicButton("enterVRBtn");
    enterVRBtn.text = "进入VR";
    enterVRBtn.scaling = new Vector3(0.5, 0.5, 0.5);
    enterVRBtn.position = new Vector3(3.5, 1, 5);
    gui3DManager.addControl(enterVRBtn);

    //3. 监听控制器输入事件，缩放盒子
    // 1）当控制器被添加进来时
    xrExperience?.input.onControllerAddedObservable.add((controller) => {
      const ctrl = controller as any;

      // 2）监听其运动控制器初始化事件，等待控制器【真正初始化完成】
      controller.onMotionControllerInitObservable.add((motionController) => {
        // 3）现在控制器准备好了！可以绑定按键了！
        if (motionController.handedness === "left") { // 左手
          const xr_ids = motionController.getComponentIds();
          let triggerComponent = motionController.getComponent(xr_ids[0]); //xr-standard-trigger
          triggerComponent.onButtonStateChangedObservable.add(() => {
            if (triggerComponent.pressed) {
              box1.scaling = new Vector3(0.8, 0.8, 0.8);
            } else {
              box1.scaling = new Vector3(1, 1, 1);
            }
          });
        }
        if (motionController.handedness === "right") { // 右手
          const xr_ids = motionController.getComponentIds();
          let triggerComponent = motionController.getComponent(xr_ids[0]); //xr-standard-trigger
          triggerComponent.onButtonStateChangedObservable.add(() => {
            if (triggerComponent.pressed) {
              box2.scaling = new Vector3(0.8, 0.8, 0.8);
            } else {
              box2.scaling = new Vector3(1, 1, 1);
            }
          });
        }
      });
    });
  };

  // 启用 Pico 设备检测，自动根据设备类型选择正确的控制器配置
  const labSceneOptions = {
    usePicoDeviceDetection: true
  };

  const bjsCanvas = ref(null); // 画布元素的引用，开始是空的，还没拿到DOM，等模板渲染完成后自动变成真实的DOM
  // With scene options
  useCanvatoriumScene(bjsCanvas, createLabContent, labSceneOptions);
</script>

<template>
  <canvas id="bjsCanvas" ref="bjsCanvas"></canvas>
</template>
