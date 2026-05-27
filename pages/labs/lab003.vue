<script lang="ts" setup>
  import { Scene, Mesh, Color3, StandardMaterial, MeshBuilder, Vector3 } from "@babylonjs/core";

  definePageMeta({
    featured: false,
    title: "Lab 003 - 默认的 XR 体验",
    description: "使用 Babylon JS 中的默认 XR 体验",
    labNotes: `使用默认 XR 体验时，玩家会自动移动到紫色的落地点。- 控制器输入示例：使用控制器上的触发器缩放盒子`
  });

  // 创建场景内容
  const createLabContent = async (scene: Scene) => {
    // 使用名称 'ground' 获取地面网格，用于玩家的传送点，这由组合函数中的labCreateRoom函数创建
    const ground = scene.getMeshByName("ground") as Mesh;
    console.log("ground", ground);
    // 1. 创建默认的 XR 体验
    // 2. 配置默认的 XR 体验，指定使用地面作为落地点
    // 3. 监听玩家进入沉浸式模式时的事件，将玩家移动到紫色的落地点
    // 4. 监听控制器输入事件，缩放盒子
    const xr = await scene.createDefaultXRExperienceAsync({
      floorMeshes: [ground]
    });

    //1. 创建紫色的落地点，用于玩家的传送点
    const purple = new StandardMaterial("purple", scene);
    purple.diffuseColor = Color3.FromHexString(labColors.purple);

    const landing = MeshBuilder.CreateCylinder("cylinder", { diameter: 1, height: 0.2 }, scene);
    landing.position = new Vector3(2, 0.1, 3);
    landing.material = purple;

    // 监听玩家进入沉浸式模式时的事件，将玩家移动到紫色的落地点
    xr.baseExperience.onInitialXRPoseSetObservable.add((xrCamera) => {
      console.log("Entering Immersive Mode with camera", xrCamera);
      xrCamera.position.z = landing.position.z;
      xrCamera.position.x = landing.position.x;
    });

    console.log("xr player created", xr);

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

    //3. 监听控制器输入事件，缩放盒子
    // 1）当控制器被添加进来时
    xr.input.onControllerAddedObservable.add((controller) => {
      // 2）监听其运动控制器初始化事件，等待控制器【真正初始化完成】
      controller.onMotionControllerInitObservable.add((motionController) => {
        // 3）现在控制器准备好了！可以绑定按键了！
        if (motionController.handness === "left") { // 左手
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
        if (motionController.handness === "right") { // 右手
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

  // Omit the scene options to use the default XR experience from useCanvatoriumScene
  const labSceneOptions = {
    useWebXRPlayer: false
  };

  const bjsCanvas = ref(null); // 画布元素的引用，开始是空的，还没拿到DOM，等模板渲染完成后自动变成真实的DOM
  // With scene options
  useCanvatoriumScene(bjsCanvas, createLabContent, labSceneOptions);
</script>

<template>
  <canvas id="bjsCanvas" ref="bjsCanvas"></canvas>
</template>
