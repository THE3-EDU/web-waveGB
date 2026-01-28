let ground;
let engine;
let importedShapes = [];
let circles = [];
const bgPath = "../assets/bg.svg";
let isMobile = false;  // 用于标识设备类型
const svgPath = "../assets/letter.svg";
let arcRadius;
let canvas;
let permissionButton;
let permissionGranted = false;
let capturer;

let recording = false;
let isMatterInitialized = false; // 标志位，表示物理世界是否已初始化

function setup() {
  canvas = createCanvas(64, 64);
  // canvas.background('black');
  // 创建一个按钮来请求权限
  permissionButton = createButton('START');
      
  permissionButton.style('width', '40%');  // 设置宽度
  permissionButton.style('height', '10%');  // 设置高度
  // 将按钮的中心点放在画布中心
  positionButtonCenter();

  permissionButton.style('font-size', '2em');
  permissionButton.style('background-color', '#fff');
  permissionButton.style('color', 'black');
  permissionButton.style('font-weight', 'bold');
  // 检查是否是移动设备
  isMobile = isIOS() || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  console.log(isMobile);

  if (!isMobile) {
    permissionButton.mousePressed(async () => {
      permissionButton.remove();
      setupMatter(); // 直接为PC端初始化物理世界
    });
  }else{
    if (isIOS()) {
      permissionButton.mousePressed(async () => {
        // 请求设备运动权限
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
          try {
            let response = await DeviceMotionEvent.requestPermission();
            if (response === 'granted') {
              permissionGranted = true;
              permissionButton.remove();  // 移除按钮
              setupMatter();  // 初始化物理世界
            } else {
              console.log("Device motion permission not granted.");
            }
          } catch (error) {
            console.error("Device motion permission request failed:", error);
          }
        } else {
          permissionGranted = true;
          permissionButton.remove();
          setupMatter();
        }
      });
    } else {
      permissionButton.mousePressed(async () => {
        permissionGranted = true;
        // 非iOS设备直接初始化物理世界
        setupMatter(permissionGranted);
        permissionButton.remove();
      })
    }
  }
}


function setupMatter() {
  engine = Matter.Engine.create();
  const world = engine.world;
  let centerX = width / 2;
  let centerY = height / 2;
  // 设置重力
  world.gravity.x = 0;  // 水平方向的重力（默认是 0）
  world.gravity.y = 0.5;  // 垂直方向的重力（默认是 1）

  new BlocksFromSVG(world, bgPath, circles, { isStatic: true, restitution: 0.0 }, { offset: { x: 0, y: 0 }, scale: 1}, permissionGranted);
  new BlocksFromSVG(world, svgPath, importedShapes, { isStatic: !isMobile, restitution: 0.0 }, { offset: { x: 0, y: 0 }, scale: 1 }, permissionGranted);

  
  mouse = new Mouse(engine, canvas, { stroke: 'white', strokeWeight: 1 });
  Matter.Runner.run(engine);

  // 判断如果是PC端或无陀螺仪设备，则施加浮动效果
  if (!isMobile) {
    applyFloatEffect();
  }
  
  // 每帧更新
  let timeStep = 1000 / 180; // 设置为 1/180 秒，即更小的步长
  Matter.Engine.update(engine, timeStep);
  isMatterInitialized = true; // 设置标志位，表示物理世界已初始化
}

function draw() {
    background('black');
    // clear();
    // 渲染 Matter.js 的圆形物体
    const scaleFactor = 64 / 551; // 目标尺寸 ÷ 当前尺寸
    scale(scaleFactor); // 缩放画布内容

    circles.forEach((shape, index) => {
      let pos = shape.body.position;
      let angle = shape.body.angle;
      push();
      translate(pos.x, pos.y);
      rotate(angle);
      pop();
      shape.draw();
    });

    importedShapes.forEach((shape, index) => {
      let pos = shape.body.position;
      let angle = shape.body.angle;
      push();
      translate(pos.x, pos.y);
      rotate(angle);
      pop();
      shape.draw();
    });
    // 录制帧
    if (recording) {
      capturer.capture(canvas.elt); // 使用底层 HTMLCanvasElement 进行捕获
    }
}


// 实现物理体的浮动效果
function applyFloatEffect() {
  let floatSpeed = 0.003;  // 控制浮动的速度
  let floatAmplitude = 0;
  let offsetLetters = {
    B: 0.003,
    W: 0.005,
    G: 0.006
  }  // 控制浮动的大小

  // 每帧更新物体的Y轴位置，实现轻微的上下浮动
  Matter.Events.on(engine, 'beforeUpdate', function() {
    importedShapes.forEach((shape) => {
      const posY = shape.body.position.y;
      console.log(shape);
      // 计算浮动幅度为圆形高度的10%
      const shapeRadius = shape.body.bounds.max.y - shape.body.bounds.min.y; // 物体高度
      floatAmplitude = shapeRadius * offsetLetters[shape.attributes.id];  // 幅度为高度的0.3%
      
      // 基于时间的浮动，控制上下的偏移量
      const offsetY = floatAmplitude * Math.sin(engine.timing.timestamp * floatSpeed); 
      
      // 更新物体的位置
      Matter.Body.setPosition(shape.body, { x: shape.body.position.x, y: posY + offsetY });
    });
  });
}
function windowResized() {
  canvas = resizeCanvas(windowWidth, windowHeight);
  circles = [];  // Clear circles array
  importedShapes = [];  // Clear imported shapes
  setupMatter();  // Recreate the world with new sizes
  positionButtonCenter();
}

// 检查是否为 iOS 设备
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function positionButtonCenter() {
  let btnWidth = permissionButton.elt.offsetWidth;
  let btnHeight = permissionButton.elt.offsetHeight;
  
  permissionButton.position(
    windowWidth / 2 - btnWidth / 2,
    windowHeight / 2 - btnHeight / 2
  );
}

