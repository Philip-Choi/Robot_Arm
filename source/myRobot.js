// global variables
var canvas, gl, program;

var BASE_HEIGHT      = 2.0;
var BASE_WIDTH       = 5.0;
var LOWER_ARM_HEIGHT = 3.0;
var LOWER_ARM_WIDTH  = 0.5;
var UPPER_ARM_HEIGHT = 3.0;
var UPPER_ARM_WIDTH  = 0.5;

var globalVertices = [
    vec4( -0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5,  0.5,  0.5, 1.0 ),
    vec4(  0.5,  0.5,  0.5, 1.0 ),
    vec4(  0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5, -0.5, -0.5, 1.0 ),
    vec4( -0.5,  0.5, -0.5, 1.0 ),
    vec4(  0.5,  0.5, -0.5, 1.0 ),
    vec4(  0.5, -0.5, -0.5, 1.0 )
];

var vertexColors = [
    vec4(0, 0, 0, 1),
    vec4(0, 0, 1, 1),
    vec4(0, 1, 0, 1),
    vec4(1, 0, 0, 1),
    vec4(0, 1, 1, 1),
    vec4(1, 1, 0, 1),
    vec4(1, 0, 1, 1),
    vec4(1, 1, 1, 1)
];

var drawingVertice = [];
var drawingColors = [];
var robotComponentIndex = [ 0, 0, 0];  // base, lowerarm, upper arm

var baseId = 0;
var lowerArmId = 1;
var upperArmId = 2;

var vBuffer;
var cBuffer;

var tempMatrix;
var modelViewMatrix;
var projectionMatrix;
var translationMatrix;
var modelViewMatrixLoc;

var stack = [];
var figure = [];

var mouseX = 0.1;
var mouseY = 0.2;

var thetaR = 0;
var lowerArmDegree = 0;
var upperArmDegree = 0;

var previouslowerArmDegree = 0;
var previousUpperArmDegree = 0;

var circleVertices = [];
var radius = 0.2;

//--------------- mouse event
function getThetaR(x, y) {

    thetaR = Math.acos(x / (Math.sqrt( Math.pow(x, 2) + Math.pow(y, 2) )));
    var degree = thetaR * 180 / Math.PI 
}

function getThetaLowerArm(x, y) {
    var length1 = LOWER_ARM_HEIGHT;
    var length2 = UPPER_ARM_HEIGHT;
    var xe = x;
    var ye = y;

    if ( (xe > 0 && ye < 0) || (xe < 0 && ye < 0)){
        thetaR = -1 * thetaR
    }

    var radian = thetaR - Math.acos( (Math.pow(length1, 2) + Math.pow(xe, 2) + Math.pow(ye, 2) - Math.pow(length2, 2)) / (2 * length1 * Math.sqrt(Math.pow(xe, 2) + Math.pow(ye, 2)))) ;
    var degree = radian * 180 / Math.PI -90
        console.log(degree);

    if (isNaN(degree)){
        lowerArmDegree = previouslowerArmDegree;
    }
    else {

        lowerArmDegree = degree;
        previouslowerArmDegree = degree;
    }
}

function getThetaUpperArm(x, y) {


    var radian = Math.PI - Math.acos( (Math.pow(LOWER_ARM_HEIGHT, 2) + Math.pow(UPPER_ARM_HEIGHT, 2) - Math.pow(x, 2) - Math.pow(y, 2)) / (2 * LOWER_ARM_HEIGHT * UPPER_ARM_HEIGHT));
    var degree = radian * 180 / Math.PI

    if (isNaN(degree)){
        upperArmDegree = previousUpperArmDegree;
    }
    else {
        upperArmDegree = degree ;
        previousUpperArmDegree = degree;
    }
}

function mouseDownEvent(event) {

    var x = event.clientX;
    var y = event.clientY;

    var midX = canvas.width/2;
    var midY = canvas.height/2;

    var rect = event.target.getBoundingClientRect();

    mouseX = ( ((x - rect.left) - midX) / midX ) * 10;
    mouseY = ( (midY - (y - rect.top)) / midY ) * 10;

    getThetaR(mouseX, mouseY);
    getThetaLowerArm(mouseX, mouseY);
    getThetaUpperArm(mouseX, mouseY);
}

var circleColor = [];
function addCircleColor(){
    for (var i = 0; i < 361; i++){
        circleColor.push(vec4( 1.0, 0.0, 0.0, 1.0 ));
    }
}

function addCircleVertices(){

    for (var i = 0; i < 360; i++) {
        circleVertices.push(vec4( radius * Math.cos((i / 100) * 2.0 * Math.PI), radius * Math.sin((i / 100) * 2.0 * Math.PI), 0.0, 1.0) );
    }
    circleVertices.push(circleVertices[0]);
}

//-----------------Process vertices----------

function quadVertices( a,  b,  c,  d ) {
    drawingColors.push(vertexColors[a]);
    drawingVertice.push(globalVertices[a]);

    drawingColors.push(vertexColors[a]);
    drawingVertice.push(globalVertices[b]);

    drawingColors.push(vertexColors[a]);
    drawingVertice.push(globalVertices[c]);

    drawingColors.push(vertexColors[a]);
    drawingVertice.push(globalVertices[a]);

    drawingColors.push(vertexColors[a]);
    drawingVertice.push(globalVertices[c]);

    drawingColors.push(vertexColors[a]);
    drawingVertice.push(globalVertices[d]);
}

function cube() {
    quadVertices( 1, 0, 3, 2 );
    quadVertices( 2, 3, 7, 6 );
    quadVertices( 3, 0, 4, 7 );
    quadVertices( 6, 5, 1, 2 );
    quadVertices( 4, 5, 6, 7 );
    quadVertices( 5, 4, 0, 1 );
}


//-------------functions required to recursively draw each robot component

function createNode(transform, render, sibling, child){
    var node = {
        transform: transform,
        render: render,
        sibling: sibling,
        child: child,
    }
    return node;
}

function initNodes(id) {

    var m = mat4();

    switch(id) {

        case baseId:
        m = rotate(robotComponentIndex[baseId], 0, 1, 0 );
        figure[baseId] = createNode( m, robotBase, null, lowerArmId );
        break;

        case lowerArmId:
        m = translate(0.0, BASE_HEIGHT, 0.0);
        m = mult(m, rotate(robotComponentIndex[lowerArmId], 0, 0, 1 ));
        // console.log(rotate(robotComponentIndex[lowerArmId], 0, 0, 1 ));
        figure[lowerArmId] = createNode( m, robotLowerArm, null, upperArmId );
        break;

        case upperArmId:
        m = translate(0.0, LOWER_ARM_HEIGHT, 0.0);
        m = mult(m, rotate(robotComponentIndex[upperArmId], 0, 0, 1));
        // console.log(rotate(robotComponentIndex[upperArmId], 0, 0, 1 ))
        figure[upperArmId] = createNode( m, robotUpperArm, null, null );
        break;
    }
}

for( var i=0; i<3; i++) {
    figure[i] = createNode(null, null, null, null);
}

// recursive function to draw the robot component 
function traverse(id) {

    if (id == null) {
        return;
    }

    stack.push(modelViewMatrix);

    modelViewMatrix = mult(modelViewMatrix, figure[id].transform);
    figure[id].render();

    if(figure[id].child != null) {
        traverse(figure[id].child);
        modelViewMatrix = stack.pop();
    }

    if(figure[id].sibling != null) {
        traverse(figure[id].sibling);
    }
}

// function to draw robot componenets
function robotBase() {
    var scale = scalem(BASE_WIDTH, BASE_HEIGHT, BASE_WIDTH);
    tempMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * BASE_HEIGHT, 0.0));
    tempMatrix = mult(tempMatrix, scale);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"),  false, flatten(tempMatrix) );
    gl.drawArrays( gl.TRIANGLES, 0, 36 );
}

function robotLowerArm()
{
    var scale = scalem(LOWER_ARM_WIDTH, LOWER_ARM_HEIGHT, LOWER_ARM_WIDTH);
    tempMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * LOWER_ARM_HEIGHT, 0.0));
    tempMatrix = mult(tempMatrix, scale);
    gl.uniformMatrix4fv( gl.getUniformLocation(program, "modelViewMatrix"),  false, flatten(tempMatrix) );
    gl.drawArrays( gl.TRIANGLES, 0, 36 );
}

function robotUpperArm() {
    var scale = scalem(UPPER_ARM_WIDTH, UPPER_ARM_HEIGHT, UPPER_ARM_WIDTH);
    tempMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * UPPER_ARM_HEIGHT, 0.0));
    tempMatrix = mult(tempMatrix, scale);
    gl.uniformMatrix4fv( gl.getUniformLocation(program, "modelViewMatrix"),  false, flatten(tempMatrix) );
    gl.drawArrays( gl.TRIANGLES, 0, 36 );
}


//----------Initialization----------------------------------------

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable( gl.DEPTH_TEST );

    //
    //  Load shaders and initialize 
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );

    gl.useProgram( program );

    canvas.addEventListener("mousedown", mouseDownEvent, false);

    cube();
    addCircleColor();
    addCircleVertices();

    // initialize slider
    document.getElementById("bodySlider").onchange = function(event) {
        robotComponentIndex[baseId] = event.target.value;
        initNodes(baseId);
    };
    document.getElementById("lowerArmSlider").onchange = function(event) {
        lowerArmDegree = event.target.value;

        initNodes(lowerArmId);
    };
    document.getElementById("upperArmSlider").onchange = function(event) {
        upperArmDegree =  event.target.value;

        initNodes(upperArmId);
    };

    // initialize  buffer 
    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(drawingVertice), gl.STATIC_DRAW );
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(drawingColors), gl.STATIC_DRAW );
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    //initialize matrix
    modelViewMatrix = mat4();

    projectionMatrix = ortho(-10, 10, -10, 10, -10, 10);
    gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),  false, flatten(projectionMatrix) );

    translationMatrix = translate(0,0,0);
    gl.uniformMatrix4fv( gl.getUniformLocation(program, "translationMatrix"),  false, flatten(translationMatrix) );

    for (var i = 0; i < 3; i++){
        initNodes(i);
    }

    render();
}

function render() {
    //clear window
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    // bind data to buffer 
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(drawingVertice), gl.STATIC_DRAW );
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(drawingColors), gl.STATIC_DRAW );

    // render robot arm one degree at a time
    if (lowerArmDegree != robotComponentIndex[lowerArmId]){
        if (lowerArmDegree > robotComponentIndex[lowerArmId]){
            robotComponentIndex[lowerArmId] = robotComponentIndex[lowerArmId] + 1;
        } else {
            robotComponentIndex[lowerArmId] = robotComponentIndex[lowerArmId] - 1;
        }
    }
        
    if (upperArmDegree != robotComponentIndex[upperArmId]){
        if ( upperArmDegree > robotComponentIndex[upperArmId]){
           robotComponentIndex[upperArmId] = robotComponentIndex[upperArmId] + 1;     
        }
        else {
            robotComponentIndex[upperArmId] = robotComponentIndex[upperArmId] - 1;
        }
    }

    for (var i = 0; i < 3; i++){
        initNodes(i);
    }
    // draw robot components 
    traverse(baseId);

    // draw circle
    modelViewMatrix = mat4();
    tempMatrix = mult(modelViewMatrix, translate(mouseX, mouseY, 0.0));
    gl.uniformMatrix4fv( gl.getUniformLocation(program, "modelViewMatrix"),  false, flatten(tempMatrix) );

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(circleVertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(circleColor), gl.STATIC_DRAW);
    gl.drawArrays( gl.TRIANGLE_FAN, 0, circleVertices.length);

    requestAnimFrame(render);
}
