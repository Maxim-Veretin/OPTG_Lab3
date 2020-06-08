// Ссылка на элемент веб страницы в котором будет отображаться графика
var container;
// Переменные "камера", "сцена" и "отрисовщик"
var camera, scene, renderer;

var geometry = new THREE.Geometry();

var N = 350;

// Глобальная переменная для хранения карты высот 
var imagedata;

//глобальные служебные переменные для хранения списка анимаций
var mixer, morphs = [];
var clock = new THREE.Clock();
var birdPaths = [];
var birds = [];
var t = 0.0;
var T = 15.0;

var keyboard = new THREEx.KeyboardState();
var keyDown = 3;
var cameraDefaultPos = new THREE.Vector3(N/2, N/2, N*1.5);
//var cameraDefaultPos = new THREE.Vector3(N/2, N*1.5, N/2);
var cameraDefaultLook = new THREE.Vector3(N/2, 0, N/2);

// Функция инициализации камеры, отрисовщика, объектов сцены и т.д.
init();
// Обновление данных по таймеру браузера
animate();

// В этой функции можно добавлять объекты и выполнять их первичную настройку
function init()
{
    // Получение ссылки на элемент html страницы
    container = document.getElementById( 'container' );
    // Создание "сцены"
    scene = new THREE.Scene();
    // Установка параметров камеры
    // 45 - угол обзора
    // window.innerWidth / window.innerHeight - соотношение сторон
    // 1 - 4000 - ближняя и дальняя плоскости отсечения
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 7000 );
    
    // Установка позиции камеры
    camera.position.copy(cameraDefaultPos);
    //camera.position.set(N/2, N*1.5, N/2);

    // Установка точки, на которую камера будет смотреть
    camera.lookAt(cameraDefaultLook);

    //#region хелпер
        //camera2 = new THREE.PerspectiveCamera(
        //    30, window.innerWidth / window.innerHeight, 1, 4000 );
        //    camera2.position.set(-N/2, N/2, N/2);
        //    camera2.lookAt(new THREE.Vector3(N/2, 0, N/2));
        //helper = new THREE.CameraHelper( camera );
        //helper.visible = true;
        //scene.add(helper);
    //#endregion

    // Создание отрисовщика
    renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor(0x7fc7ff, 1);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.appendChild( renderer.domElement );
    // Добавление функции обработки события изменения размеров окна
    window.addEventListener( 'resize', onWindowResize, false );

    //создание точечного источника освещения заданного цвета
    var light = new THREE.DirectionalLight(0xffff00);
    //установка позиции источника освещения
    light.position.set(N*2, N, N/2);
    // направление освещения
    light.target = new THREE.Object3D();
    light.target.position.set( N/2, 0, N/2 );
    scene.add(light.target);

    // включение расчёта теней
    light.castShadow = true;
    // параметры области расчёта теней
    light.shadow = new THREE.LightShadow(new THREE.PerspectiveCamera(45, 1, 10, 1000));
    light.shadow.bias = 0.0001;
    // размер карты теней
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    //добавление источника в сцену
    scene.add(light);

    var helper = new THREE.CameraHelper(light.shadow.camera);
    scene.add( helper );

    //создание списка анимаций в функции Init
    mixer = new THREE.AnimationMixer( scene );
    
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    var img = new Image();
    img.onload = function()
    {     
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0 );
        imagedata = context.getImageData(0, 0, img.width, img.height);
        // Пользовательская функция генерации ландшафта
        CreateGround();

        // вызов функции загрузки модели (в функции Init)
        LoadStaticModel('models/static/Palm/', "Palma 001.obj", "Palma 001.mtl");
        //for (var i = 0; i < 100; i++)
            LoadAnimatedModel('models/animate/Parrot.glb');
        LoadAnimatedModel('models/animate/Stork.glb');
    }
    img.src = 'textures/lake.jpg';

    birdPaths.push(CreatePathParrot());
    birdPaths.push(CreatePathStork());

    CreateSky();
}

function onWindowResize()
{
 // Изменение соотношения сторон для виртуальной камеры
 camera.aspect = window.innerWidth / window.innerHeight;
 camera.updateProjectionMatrix();

 // Изменение соотношения сторон рендера
 renderer.setSize( window.innerWidth, window.innerHeight );
}

// В этой функции можно изменять параметры объектов и обрабатывать действия пользователя
function animate()
{
    var delta = clock.getDelta();
    mixer.update(delta);

    for (var i = 0; i < morphs.length; i++)
    {
        var morph = morphs[i];
         
        var pos = new THREE.Vector3();
        pos.copy(birdPaths[i].getPointAt(t/T));
        
        birds[i].body.position.copy(pos);
        
        t += delta;

        if (t >= T)
            t = 0.0;

        var nextPoint = new THREE.Vector3();
        nextPoint.copy(birdPaths[i].getPointAt((t+0.001)/T));
        
        morph.lookAt(nextPoint);

        if (t >= T)
            t = 0.0;
    }

    CameraLookAt();
    CameraMove(keyDown);

    if (keyboard.pressed("S"))
        cameraDefaultPos.z += 3;
    if (keyboard.pressed("W"))
        cameraDefaultPos.z -= 3;
    if (keyboard.pressed("A"))
        {
            camera.rotation.y += 0.5
        }
    if (keyboard.pressed("D"))
        {
            camera.rotation.y -= 0.5
        }

    // Добавление функции на вызов, при перерисовки браузером страницы
    requestAnimationFrame( animate );
    render();
}

function render()
{
 // Рисование кадра
 renderer.render( scene, camera );
}

function CreateGround()
{
    // Добавление координат вершин в массив вершин
    for (var x = 0; x < N; x++)
    {
        for (var z = 0; z < N; z++)
        {
            var h = GetPixel( imagedata, x, z );
            geometry.vertices.push(new THREE.Vector3( x, h/10, z));
        }
    }
    
    for (var i = 0; i < N-1; i++)
    {
        for (var j = 0; j < N-1; j++)
        {
            var i1 = i + j*N;
            var i2 = (i + 1) + j*N;
            var i3 = (i + 1) + (j + 1)*N;
            var i4 = i + (j + 1)*N;
            
            geometry.faces.push(new THREE.Face3(i1, i2, i3));
            geometry.faces.push(new THREE.Face3(i1, i3, i4));
            
            geometry.faceVertexUvs[0].push([
                new THREE.Vector2(i/(N-1), j/(N-1)),
                new THREE.Vector2((i+1)/(N-1), j/(N-1)),
                new THREE.Vector2((i+1)/(N-1), (j+1)/(N-1))]);
                
            geometry.faceVertexUvs[0].push([
                new THREE.Vector2(i/(N-1), j/(N-1)),
                new THREE.Vector2((i+1)/(N-1), (j+1)/(N-1)),
                new THREE.Vector2(i/(N-1), (j+1)/(N-1))
            ]);
        }
    }
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    // Создание загрузчика текстур
    var loader = new THREE.TextureLoader();
    // Загрузка текстуры grasstile.jpg из папки pics
    var tex = loader.load( 'textures/grasstile.jpg' );
    
    // Режим повторения текстуры 
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;  
    // Повторить текстуру 10х10 раз 
    tex.repeat.set( 2, 2 );

    var mat = new THREE.MeshLambertMaterial({
        // color source is the texture
        map: tex,
        wireframe: false,
        side: THREE.DoubleSide
    });
    // Создание объекта и установка его в определённую позицию
    var groundMesh = new THREE.Mesh(geometry, mat);
    groundMesh.position.set(0.0, 0.0, 0.0);
    groundMesh.receiveShadow = true;
    
    // Добавление объекта в сцену
    scene.add(groundMesh);    
}

function GetPixel( imagedata, x, y )
{     
    var position = ( x + imagedata.width * y ) * 4, data = imagedata.data;
    return data[ position ];;
}

// load static model
function LoadStaticModel(path, oname, mname)
{
    // функция, выполняемая в процессе загрузки модели (выводит процент загрузки)
    var onProgress = function ( xhr ) {
        if ( xhr.lengthComputable ) {
                var percentComplete = xhr.loaded / xhr.total * 100;
                console.log( Math.round(percentComplete, 2) + '% downloaded' );
            }
        };
    // функция, выполняющая обработку ошибок, возникших в процессе загрузки
    var onError = function ( xhr ) { };
    // функция, выполняющая обработку ошибок, возникших в процессе загрузки
    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath( path );
    
    // функция загрузки материала
    mtlLoader.load( mname, function( materials )
    {
        materials.preload();
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials( materials );
        objLoader.setPath( path );
        
        // функция загрузки модели
        objLoader.load( oname, function ( object )
        {
            object.receiveShadow = true;
            object.castShadow = true;

            object.traverse( function ( child )
            {
                if ( child instanceof THREE.Mesh )
                {
                    child.receiveShadow = true;
                    child.castShadow = true;
                }
            } );

            for (var i = 0; i < 50; i++)
            {
                var x = Math.random() * N;
                var z = Math.random() * N;
                var y = geometry.vertices[ Math.round(x) + Math.round(z) * (N-10)].y;

                object.position.x = x;
                object.position.y = y;
                object.position.z = z;
                
                var s = ((Math.random() * 100) + 30) / 400;
                object.scale.set(s, s, s);

                scene.add(object.clone());
                //console.log(i+1 + 'palm');
            }
        }, onProgress, onError );
    });
}

// path is a directory path and name model
function LoadAnimatedModel(path)
{
    var loader = new THREE.GLTFLoader();
    loader.load( path, function ( gltf )
    {
        var mesh = gltf.scene.children[ 0 ];
        var clip = gltf.animations[ 0 ];
        
        //установка параметров анимации (скорость воспроизведения и стартовый фрейм)
        mixer.clipAction( clip, mesh ).setDuration( 1 ).startAt( Math.random() ).play();
        
        var x = Math.random() * N;
        var z = Math.random() * N;

        //mesh.position.set( x, N/5, z );
        mesh.position.set( 220, 54, 220 );
        mesh.rotation.y = Math.PI / 8;
        mesh.scale.set( 0.2, 0.2, 0.2 );

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        scene.add( mesh );
        morphs.push( mesh );

        var bird = {
            body: mesh,
            posX: mesh.position.x,
            posY: mesh.position.y,
            posZ: mesh.position.z
        };
        birds.push(bird);
    } );
}

function CreatePathParrot()
{
    var curve1 = new THREE.CubicBezierCurve3(
        new THREE.Vector3( 220, 60, 220 ), //P0
        new THREE.Vector3( 470, 60, 220 ), //P1
        new THREE.Vector3( 220, 60, 470 ), //P2
        new THREE.Vector3( 220, 60, 220  ) //P3
       );
    var curve2 = new THREE.CubicBezierCurve3(
        new THREE.Vector3( 220, 60, 220 ), //P0
        new THREE.Vector3( 220, 60, 0 ), //P1
        new THREE.Vector3( 0, 60, 220 ), //P2
        new THREE.Vector3( 220, 60, 220  ) //P3
       );

    var vertices = [];
    // получение 200-ти точек на заданной кривой
    vertices = curve1.getPoints( 40 );
    vertices = vertices.concat(curve2.getPoints( 40 ));

    // создание кривой по списку точек
    var path = new THREE.CatmullRomCurve3(vertices);
    // является ли кривая замкнутой (зацикленной)
    path.closed = true;

    var geometry = new THREE.Geometry();
    geometry.vertices = vertices;
    var material = new THREE.LineBasicMaterial( { color : 0xffff00 } );
    var curveObject = new THREE.Line( geometry, material );
    scene.add(curveObject);

    return path;
}

function CreatePathStork()
{
    var curve1 = new THREE.CubicBezierCurve3(
        new THREE.Vector3( 50, 80, 100 ), //P0
        new THREE.Vector3( 50, 80, 0 ), //P1
        new THREE.Vector3( 150, 80, 0 ), //P2
        new THREE.Vector3( 150, 80, 100  ) //P3
       );
    var curve2 = new THREE.CubicBezierCurve3(
        new THREE.Vector3( 150, 80, 100 ), //P0
        new THREE.Vector3( 150, 80, 200 ), //P1
        new THREE.Vector3( 50, 80, 200 ), //P2
        new THREE.Vector3( 50, 80, 100  ) //P3
       );

    var vertices = [];
    // получение 200-ти точек на заданной кривой
    vertices = curve1.getPoints( 40 );
    vertices = vertices.concat(curve2.getPoints( 40 ));

    // создание кривой по списку точек
    var path = new THREE.CatmullRomCurve3(vertices);
    // является ли кривая замкнутой (зацикленной)
    path.closed = true;

    var geometry = new THREE.Geometry();
    geometry.vertices = vertices;
    var material = new THREE.LineBasicMaterial( { color : 0xffff00 } );
    var curveObject = new THREE.Line( geometry, material );
    scene.add(curveObject);

    return path;
}

function CameraLookAt()
{
    if (keyboard.pressed("3"))
    {
        keyDown = 3;
    }

    if (keyboard.pressed("1"))
    {
        keyDown = 1;
    }
    
    if (keyboard.pressed("2"))
    {
        keyDown = 2;
    }
}

function CameraMove(keyDown)
{
    if (keyDown == 3)
    {
        camera.position.copy(cameraDefaultPos);
        camera.lookAt(cameraDefaultLook);
    }
    else if (keyDown == 1 || keyDown == 2)
    {
        // установка смещения камеры относительно объекта
        var relativeCameraOffset = new THREE.Vector3(0, 10, -50);

        var m1 = new THREE.Matrix4();
        var m2 = new THREE.Matrix4();
        // получение поворота объекта
        m1.extractRotation(birds[keyDown-1].body.matrixWorld);
        // получение позиции объекта
        m2.extractPosition(birds[keyDown-1].body.matrixWorld);
        m1.multiplyMatrices(m2, m1);
        // получение смещения позиции камеры относительно объекта
        var cameraOffset = relativeCameraOffset.applyMatrix4(m1);
        // установка позиции и направления взгляда камеры
        camera.position.copy(cameraOffset);
        camera.lookAt(birds[keyDown-1].body.position );
    }
}

function CreateSky()
{
    // создание сферы
    var geometry = new THREE.SphereGeometry( 1000, 64, 64 );
    var geometry1 = new THREE.SphereGeometry( 1006, 64, 64 );
    var geometry2 = new THREE.SphereGeometry( 3000, 128, 128 );

    var loader = new THREE.TextureLoader();

    // загрузка текстуры
    var tex = loader.load( "textures/uranusmap.jpg" );
    tex.minFilter = THREE.NearestFilter;
    var tex1 = loader.load( "textures/smile2.jpg" );
    tex1.minFilter = THREE.NearestFilter;
    var tex2 = loader.load( "textures/party.jpg" );
    tex2.minFilter = THREE.NearestFilter;
    
    // создание материала
    var material = new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.DoubleSide
    });
    var material1 = new THREE.MeshBasicMaterial({
        map: tex1,
        side: THREE.DoubleSide
    });
    var material2 = new THREE.MeshBasicMaterial({
        map: tex2,
        side: THREE.DoubleSide
    });

    //создание сферы и его размещение в сцене
    var sphere = new THREE.Mesh( geometry, material );
    var sphere1 = new THREE.Mesh( geometry1, material1 );
    var sphere2 = new THREE.Mesh( geometry2, material2 );

    var posSphere = new THREE.Vector3(N/2, 0, N/2);
    var posSphere1 = new THREE.Vector3(N/2, 0, N/2);
    var posSphere2 = new THREE.Vector3(N/2, 0, N/2);

    sphere.position.copy(posSphere);
    sphere1.position.copy(posSphere1);
    sphere2.position.copy(posSphere2);

    sphere1.rotation.y = -45.25;
    //scene.add(sphere);
    scene.add(sphere1);
    //scene.add(sphere2);
}