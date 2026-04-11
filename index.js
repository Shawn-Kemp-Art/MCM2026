
document.body.innerHTML = '<style>div{color: grey;text-align:center;position:absolute;margin:auto;top:0;right:0;bottom:0;left:0;width:500px;height:100px;}</style><body><div id="loading"><p>This could take a while, please give it at least 5 minutes to render.</p><br><h1 class="spin">⏳</h1><br><h3>Press <strong>?</strong> for shortcut keys</h3><br><p><small>Output contains an embedded blueprint for creating an IRL wall sculpture</small></p></div></body>';

paper.install(window);
window.onload = function() {

document.body.innerHTML = '<style>body {margin: 0px;text-align: center;}</style><canvas resize="true" style="display:block;width:100%;" id="myCanvas"></canvas>';

setquery("fxhash",$fx.hash);
var initialTime = new Date().getTime();

//file name 
var fileName = $fx.hash;

var canvas = document.getElementById("myCanvas");

paper.setup('myCanvas');
paper.activate();

//vvvvvvvvvvvvvvv CLIPPER BOOLEAN ENGINE vvvvvvvvvvvvvvv
var CLIP_SCALE = 100;   // Integer precision for Clipper (100 = 0.01 unit resolution)
var CLIP_FLATTEN = 0.1; // Bezier-to-polygon tolerance (lower = smoother, more points)

function _toClipperPaths(paperItem) {
    var clone = paperItem.clone({ insert: false });
    clone.flatten(CLIP_FLATTEN);
    var children = (clone.className === 'CompoundPath') ? clone.children : [clone];
    var result = [];
    for (var i = 0; i < children.length; i++) {
        var segs = children[i].segments;
        if (segs.length < 3) continue;
        var pts = new Array(segs.length);
        for (var j = 0; j < segs.length; j++) {
            pts[j] = { X: Math.round(segs[j].point.x * CLIP_SCALE),
                       Y: Math.round(segs[j].point.y * CLIP_SCALE) };
        }
        result.push(pts);
    }
    clone.remove();
    return result;
}

function _fromClipperPaths(clipperPaths) {
    if (!clipperPaths || clipperPaths.length === 0) return new Path();
    var compound = new CompoundPath({});
    for (var i = 0; i < clipperPaths.length; i++) {
        var pts = clipperPaths[i];
        if (pts.length < 3) continue;
        var paperPts = new Array(pts.length);
        for (var j = 0; j < pts.length; j++) {
            paperPts[j] = new Point(pts[j].X / CLIP_SCALE, pts[j].Y / CLIP_SCALE);
        }
        compound.addChild(new Path({ segments: paperPts, closed: true, insert: false }));
    }
    // Use non-zero winding — matches Paper.js canvas default and Clipper's output orientation.
    // CleanPolygons removes near-degenerate edges that can cause winding flips at fine tolerances.
    ClipperLib.Clipper.CleanPolygons(clipperPaths, 0.5);
    compound.reorient(true, true);
    return compound;
}

function _clipBool(a, b, clipType) {
    var savedStyle = a.style;
    var clipper = new ClipperLib.Clipper();
    clipper.AddPaths(_toClipperPaths(a), ClipperLib.PolyType.ptSubject, true);
    clipper.AddPaths(_toClipperPaths(b), ClipperLib.PolyType.ptClip, true);
    var solution = new ClipperLib.Paths();
    clipper.Execute(clipType, solution,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero);
    var result = _fromClipperPaths(solution);
    result.style = savedStyle;
    return result;
}

function clipUnite(a, b)     { return _clipBool(a, b, ClipperLib.ClipType.ctUnion); }
function clipSubtract(a, b)  { return _clipBool(a, b, ClipperLib.ClipType.ctDifference); }
function clipIntersect(a, b) { return _clipBool(a, b, ClipperLib.ClipType.ctIntersection); }
//^^^^^^^^^^^^^ END CLIPPER BOOLEAN ENGINE ^^^^^^^^^^^^^

console.log('hash: '+$fx.hash)
console.log('#'+$fx.iteration)

canvas.style.background = "white";

//Set a seed value for Perlin
var seed = Math.floor($fx.rand()*10000000000000000);

//initialize perlin noise 
var noise = new perlinNoise3d();
noise.noiseSeed(seed);

//read in query strings
var qcolor1 = "AllColors";
if(new URLSearchParams(window.location.search).get('c1')){qcolor1 = new URLSearchParams(window.location.search).get('c1')}; //colors1
var qcolor2 = "None";
if(new URLSearchParams(window.location.search).get('c2')){qcolor2 = new URLSearchParams(window.location.search).get('c2')}; //colors2
var qcolor3 = "None";
if(new URLSearchParams(window.location.search).get('c3')){qcolor3 = new URLSearchParams(window.location.search).get('c3')}; //colors3
var qcolors = R.random_int(1,6);
if(new URLSearchParams(window.location.search).get('c')){qcolors = new URLSearchParams(window.location.search).get('c')}; //number of colors
var qsize = "2";
if(new URLSearchParams(window.location.search).get('s')){qsize = new URLSearchParams(window.location.search).get('s')}; //size
var qcomplexity = R.random_int(1,10);
if(new URLSearchParams(window.location.search).get('d')){qcomplexity = new URLSearchParams(window.location.search).get('d')}; //size
qcomplexity = qcomplexity+3;

var qorientation =R.random_int(1,2) < 2 ? "portrait" : "landscape";
var qframecolor = R.random_int(0,3) < 1 ? "White" : R.random_int(1,3) < 2 ? "Mocha" : "Random";     
var qmatwidth = R.random_int(50,100);
var qlayout = ["Totem", "Banded", "Stacked", "Cluster"][R.random_int(0,3)];
var qvariation = R.random_int(1,2) < 2 ? "On" : "Off";
var qrotation = R.random_int(1,2) < 2 ? "Allowed" : "Aligned";


//fxparams
definitions = [
    {
        id: "layers",
        name: "Layers",
        type: "number",
        default: 12,
        options: {
            min: 6,
            max: 24,
            step: 1,
        },  
    },
    {
        id: "orientation",
        name: "Orientation",
        type: "select",
        default: qorientation,
        options: {options: ["portrait", "landscape"]},
    },
    {
        id: "aspectratio",
        name: "Aspect ratio",
        type: "select",
        default: "4:5",
        options: {options: ["1:1", "2:5","3:5","4:5","54:86","296:420"]},
    },
    {
        id: "size",
        name: "Size",
        type: "select",
        default: qsize,
        options: {options: ["1", "2", "3"]},
    },
    {
        id: "colors",
        name: "Max # of colors",
        type: "number",
        default: qcolors,
        options: {
            min: 1,
            max: 6,
            step: 1,
        },  
    },
    {
        id: "colors1",
        name: "Pallete 1",
        type: "select",
        default: qcolor1,
        options: {options: palleteNames},
    },
    {
        id: "colors2",
        name: "Pallete 2",
        type: "select",
        default: qcolor2,
        options: {options: palleteNames},
    },
    {
        id: "colors3",
        name: "Pallete 3",
        type: "select",
        default: qcolor3,
        options: {options: palleteNames},
    },
    {
        id: "framecolor",
        name: "Frame color",
        type: "select",
        default: qframecolor,
        options: {options: ["Random","White","Mocha"]},
    },
    {
        id: "density",
        name: "Density",
        type: "number",
        default: qcomplexity,
        options: {
            min: 4,
            max: 13,
            step: 1,
        },
    },
    {
        id: "layout",
        name: "Layout",
        type: "select",
        default: qlayout,
        options: {options: ["Totem", "Banded", "Stacked", "Cluster"]},
    },
    {
        id: "variation",
        name: "Layer variation",
        type: "select",
        default: qvariation,
        options: {options: ["On", "Off"]},
    },
    {
        id: "rotation",
        name: "Rotation",
        type: "select",
        default: qrotation,
        options: {options: ["Allowed", "Aligned"]},
    },
    {
        id: "matwidth",
        name: "Mat size",
        type: "number",
        default: qmatwidth,
        options: {
            min: 50,
            max: 150,
            step: 10,
        },  
    },
   
    ]


$fx.params(definitions)
var scale = $fx.getParam('size');
var stacks = $fx.getParam('layers');
var numofcolors = $fx.getParam('colors');


//Set the properties for the artwork where 100 = 1 inch
var wide = 800; 
var high = 1000; 

if ($fx.getParam('aspectratio')== "1:1"){wide = 800; high = 800};
if ($fx.getParam('aspectratio')== "2:5"){wide = 400; high = 1000};
if ($fx.getParam('aspectratio')== "3:5"){wide = 600; high = 1000};
if ($fx.getParam('aspectratio')== "4:5"){wide = 800; high = 1000};
if ($fx.getParam('aspectratio')== "54:86"){wide = 540; high = 860};
if ($fx.getParam('aspectratio')== "296:420"){wide =705; high = 1000};


var ratio = 1/scale;//use 1/4 for 32x40 - 1/3 for 24x30 - 1/2 for 16x20 - 1/1 for 8x10
var minOffset = ~~(7*ratio); //this is aproximatly .125"
var framewidth = ~~($fx.getParam('matwidth')*ratio*scale); 
var framradius = 0;


// Set a canvas size for when layers are exploded where 100=1in
var panelWide = 1600; 
var panelHigh = 2000; 
 
paper.view.viewSize.width = 2400;
paper.view.viewSize.height = 2400;


var colors = []; var palette = []; 

// set a pallete based on color schemes
var newPalette = [];
newPalette = this[$fx.getParam('colors1')].concat(this[$fx.getParam('colors2')],this[$fx.getParam('colors3')]);
for (c=0; c<numofcolors; c=c+1){palette[c] = newPalette[R.random_int(0, newPalette.length-1)]}  
console.log(newPalette);

//randomly assign colors to layers
for (c=0; c<stacks; c=c+1){colors[c] = palette[R.random_int(0, palette.length-1)];};

//or alternate colors
p=0;for (var c=0; c<stacks; c=c+1){colors[c] = palette[p];p=p+1;if(p==palette.length){p=0};}

console.log(colors);

if ($fx.getParam('framecolor')=="White"){colors[stacks-1]={"Hex":"#FFFFFF", "Name":"Smooth White"}};
if ($fx.getParam('framecolor')=="Mocha"){colors[stacks-1]={"Hex":"#4C4638", "Name":"Mocha"}};


var woodframe = new Path();var framegap = new Path();
var fColor = frameColors[R.random_int(0, frameColors.length-1)];
fColor = {"Hex":"#60513D","Name":"Walnut"};
var frameColor = fColor.Hex;

//adjust the canvas dimensions
w=wide;h=high;
var orientation="Portrait";
 
if ($fx.getParam('orientation')=="landscape"){wide = h;high = w;orientation="Landscape";};
if ($fx.getParam('orientation')=="portrait"){wide = w;high = h;orientation="Portrait";};

//setup the project variables


//Set the line color
linecolor={"Hex":"#4C4638", "Name":"Mocha"};


//************* Draw the layers ************* 


sheet = []; //This will hold each layer

var px=0;var py=0;var pz=0;var prange=.1; 


// Define composition
// -------------------
// Integrity invariant: every shape is placed inside a bounding box. All bounding
// boxes are separated from each other and from the inner frame edge by at least
// `safeGap`, so the uncut material always forms a single connected region welded
// to the frame. No runtime topology check is needed.
var drawareawide = wide-framewidth*2;
var drawareahigh = high-framewidth*2;
var safeGap = minOffset * 3;

var layoutMode = $fx.getParam('layout');
var density = $fx.getParam('density');

var composition = [];
if (layoutMode === 'Totem')         composition = buildTotem(density);
else if (layoutMode === 'Banded')   composition = buildBanded(density);
else if (layoutMode === 'Stacked')  composition = buildStacked(density);
else if (layoutMode === 'Cluster')  composition = buildCluster(density);



var features = {};
var renderTime;

paper.view.autoUpdate = false;

(async () => {

//---- Draw the Layers


for (z = 0; z < stacks; z++) {
    pz = z * prange;

    drawFrame(z); // every layer gets the frame ring

    // Top layer (z = stacks-1) is a clean "mat" frame: no solid interior, no
    // composition cuts. The signature is still cut into its bottom frame.
    // All composition cuts happen on layers 0 .. stacks-2.
    if (z < stacks - 1) {
        solid(z);

        for (i = 0; i < composition.length; i++) {
            var box = composition[i];
            // Depth gate: shape is cut on layer z iff the distance from the
            // topmost cut layer (stacks-2) is less than the shape's depth.
            //   depth = 1 → cuts only stacks-2 (shallowest)
            //   depth = stacks-1 → cuts stacks-2 down to 0 (through-cut)
            if ((stacks - 2 - z) >= box.depth) continue;

            var minDim = Math.min(box.w, box.h);
            var zshrink = ~~((stacks - z - 1) * (minDim / (stacks * 4)));

            var shape = makeShape(box, zshrink);
            if (shape) cut(z, shape);
        }
    }

    frameIt(z);// finish the layer with a final frame cleanup 

    cutMarks(z);
    hanger(z);// add hanger holes
    if (z == stacks-1) {signature(z);}// sign the top layer
    sheet[z].scale(2.2);
    sheet[z].position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
   
    var group = new Group(sheet[z]);
    
    console.log(z)//Show layer completed in console

    paper.view.update();
    await new Promise(resolve => setTimeout(resolve, 0));

}//end z loop

//--------- Finish up the preview ----------------------- 

    // Build the features and trigger an fxhash preview
    features = {};
    features.Size =  ~~(wide/100/ratio)+" x "+~~(high/100/ratio)+" inches";
    features.Width = ~~(wide/100/ratio);
    features.Height = ~~(high/100/ratio);
    features.Depth = stacks*0.0625;
    features.Layers = stacks;
    for (l=stacks;l>0;l--){
    var key = "layer: "+(stacks-l+1)
    features[key] = colors[l-1].Name
    }
    console.log(features);
    $fx.features(features);
    //$fx.preview();

//Begin send to studio.shawnkemp.art **************************************************************
     studioAPI.setApiBase('https://studio-shawnkemp-art.vercel.app');
     if(new URLSearchParams(window.location.search).get('skart')){sendAllExports()};
//End send to studio.shawnkemp.art **************************************************************

      var finalTime = new Date().getTime();
    renderTime = (finalTime - initialTime)/1000
    console.log ('Render took : ' +  renderTime.toFixed(2) + ' seconds' );

    paper.view.autoUpdate = true;
    paper.view.update();

})();

async function sendAllExports() {

        paper.view.update();
        // Send canvas as PNG
        await studioAPI.sendCanvas(myCanvas, $fx.hash, $fx.hash+".png");

        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, $fx.hash+".svg");

        // send colors
        var content = JSON.stringify(features,null,2);

        // Send text/JSON
        await studioAPI.sendText(JSON.stringify(colors), $fx.hash, "Colors-"+$fx.hash+".json");

        // 2. Add frame
        floatingframe();
        paper.view.update();
        // 3. Framed PNGs (Black, White, Walnut, Maple)
        var frameOptions = [
            { name: "Black", hex: "#1f1f1f" },
            { name: "White", hex: "#f9f9f9" },
            { name: "Walnut", hex: "#60513D" },
            { name: "Maple", hex: "#ebd9c0" }
        ];
        for (var i = 0; i < frameOptions.length; i++) {
            woodframe.style = { fillColor: frameOptions[i].hex };
            var fileName = "Framed" + frameOptions[i].name + "-" + $fx.hash;
            paper.view.update();

            await studioAPI.sendCanvas(myCanvas,  $fx.hash, fileName+".png");
        }
        // 4. Remove frame
        floatingframe();
        // 5. Blueprint SVG
        for (var z = 0; z < stacks; z++) {
            sheet[z].style = {
                fillColor: null,
                strokeWidth: 0.1,
                strokeColor: lightburn[stacks - z - 1].Hex,
                shadowColor: null,
                shadowBlur: null,
                shadowOffset: null
            };
            sheet[z].selected = true;
        }
        paper.view.update();

        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, "Blueprint-" + $fx.hash+".svg");
        // 6. Plotting SVG
        for (var z = 0; z < stacks; z++) {
            sheet[z].style = {
                fillColor: null,
                strokeWidth: 0.1,
                strokeColor: plottingColors[stacks - z - 1].Hex,
                shadowColor: null,
                shadowBlur: null,
                shadowOffset: null
            };
            sheet[z].selected = true;
        }
        for (var z = 0; z < stacks; z++) {
            if (z < stacks - 1) {
                for (var zs = z + 1; zs < stacks; zs++) {
                    var old = sheet[z];
                    sheet[z] = clipSubtract(sheet[z], sheet[zs]);
                    old.remove();
                }
            }
        }
        paper.view.update();
        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, "Plotting-" + $fx.hash+".svg");

        // Send features
        await studioAPI.sendFeatures($fx.hash, features);

        console.log("All exports sent!");
        studioAPI.signalComplete();
    }


      

//vvvvvvvvvvvvvvv PROJECT FUNCTIONS vvvvvvvvvvvvvvv 
 
function somelines(z){
        p = []
        y = R.random_int(0, high);
        p[0]=new Point(0,y)
        y2 = R.random_int(0, high);
        p[1]=new Point(wide,y2)
        lines = new Path.Line (p[0],p[1]);
        mesh = PaperOffset.offsetStroke(lines, minOffset,{ cap: 'butt' });
        mesh.flatten(4);
        mesh.smooth();
        lines.remove();
        join(z,mesh);
        mesh.remove();


}


// ---------- Composition builders ----------
// Each builder returns an array of entries:
//   { x, y, w, h, type, angle, seed, depth }
// Invariant: every primary entry is inset from the inner frame edge by
// >= safeGap and separated from every other primary by >= safeGap. Nested
// concentric inner entries share the primary's center and shrink inward, so
// they never cross the primary's bounding box. The uncut material always
// forms a single connected region welded to the frame ring.
//
// `depth` controls which layers cut the entry. See the main loop for the gate.
// Outer shapes in a nest get small depths; inner shapes get larger depths, so
// the viewer sees stepped concentric rings of successive layer colors.

// Split `total - (n-1)*gap` into n heights drawn from a harmonic/golden ratio
// series. Shuffled so the biggest is not always first.
function proportionalHeights(n, total, gap) {
    var shapeTotal = Math.max(0, total - (n - 1) * gap);
    var ratios = [1, 0.85, 0.75, 0.618, 0.5, 0.382, 0.309];

    var picks = [];
    for (var i = 0; i < n; i++) {
        picks.push(ratios[R.random_int(0, Math.min(ratios.length - 1, n + 1))]);
    }
    var sum = 0;
    for (var i = 0; i < picks.length; i++) sum += picks[i];
    var out = [];
    for (var i = 0; i < picks.length; i++) out.push(shapeTotal * picks[i] / sum);

    // Fisher-Yates shuffle (seeded through R)
    for (var i = out.length - 1; i > 0; i--) {
        var j = R.random_int(0, i);
        var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
}

// Pick a depth for a standalone (non-nested) shape. Variation "Off" forces
// every shape to cut through every layer; "On" picks a tiered depth so some
// shapes sit shallow and others cut deep.
function pickDepth() {
    var maxDepth = Math.max(1, stacks - 1);
    if ($fx.getParam('variation') === 'Off') return maxDepth;
    var r = R.random_dec();
    if (r < 0.25) return R.random_int(1, 2);
    if (r < 0.65) return R.random_int(3, Math.max(3, Math.floor(stacks * 0.5)));
    return R.random_int(Math.max(3, Math.floor(stacks * 0.5)), maxDepth);
}

// Given a primary bounding box, return a list of concentric entries. levels=0
// means just the primary (with a tiered random depth). levels>0 returns the
// primary + `levels` inner shapes, each at ~22-34% shrink and monotonically
// increasing depth so the reveal steps through successive layer colors.
function makeNest(box, levels) {
    var out = [];
    var maxDepth = Math.max(1, stacks - 1);

    if (levels === 0) {
        out.push({
            x: box.x, y: box.y, w: box.w, h: box.h,
            type: box.type, angle: box.angle, orient: box.orient, seed: box.seed,
            depth: pickDepth()
        });
        return out;
    }

    // Nested: outer shallow, each level steps deeper
    var baseDepth = R.random_int(1, 3);
    var depthStep = R.random_int(1, 3);
    var shrinkStep = 0.22 + R.random_dec() * 0.12;
    var variationOff = $fx.getParam('variation') === 'Off';

    for (var i = 0; i <= levels; i++) {
        var s = 1 - i * shrinkStep;
        if (s <= 0.28) break;
        var w = box.w * s;
        var h = box.h * s;
        var cx = box.x + box.w / 2;
        var cy = box.y + box.h / 2;
        var depth = variationOff ? maxDepth : Math.min(maxDepth, baseDepth + i * depthStep);
        out.push({
            x: cx - w / 2, y: cy - h / 2, w: w, h: h,
            type: box.type,      // same type as parent for concentric read
            angle: box.angle,    // same angle so rings stay aligned
            orient: box.orient,  // same orientation for concentric dome/arch/quarter
            seed: box.seed + i * 7.3,
            depth: depth
        });
    }
    return out;
}

// Mirror an entry horizontally about axisX. Preserves size/type/depth.
function mirrorEntry(entry, axisX) {
    return {
        x: 2 * axisX - (entry.x + entry.w),
        y: entry.y,
        w: entry.w,
        h: entry.h,
        type: entry.type,
        angle: -entry.angle,
        orient: mirrorOrient(entry.type, entry.orient),
        seed: entry.seed + 101,
        depth: entry.depth
    };
}

function pickNestLevels(probability) {
    if (R.random_dec() >= probability) return 0;
    return R.random_int(1, 3);
}


function buildTotem(count) {
    var topEdge = framewidth + safeGap;
    var bottomEdge = high - framewidth - safeGap;
    var leftEdge = framewidth + safeGap;
    var rightEdge = wide - framewidth - safeGap;
    var totalHigh = bottomEdge - topEdge;

    // 3-6 bold primaries, lightly correlated with density
    var primaryCount = Math.max(3, Math.min(Math.floor(2 + count / 3), 6));
    var heights = proportionalHeights(primaryCount, totalHigh, safeGap);

    var columnWide = (rightEdge - leftEdge) * 0.80;
    var columnCenterX = (leftEdge + rightEdge) / 2;
    var wRatios = [1, 0.85, 0.75, 0.618, 0.5];

    var out = [];
    var y = topEdge;
    for (var i = 0; i < primaryCount; i++) {
        var h = heights[i];
        var w = columnWide * wRatios[R.random_int(0, wRatios.length - 1)];
        var x = columnCenterX - w / 2; // centered on vertical axis
        var primary = makePrimary(x, y, w, h);
        var nested = makeNest(primary, pickNestLevels(0.65));
        for (var j = 0; j < nested.length; j++) out.push(nested[j]);
        y += h + safeGap;
    }
    return out;
}

function buildBanded(count) {
    var topEdge = framewidth + safeGap;
    var bottomEdge = high - framewidth - safeGap;
    var leftEdge = framewidth + safeGap;
    var rightEdge = wide - framewidth - safeGap;
    var availHigh = bottomEdge - topEdge;
    var availWide = rightEdge - leftEdge;

    var primaryCount = Math.max(3, Math.min(Math.floor(2 + count / 3), 5));
    var heights = proportionalHeights(primaryCount, availHigh, safeGap);

    var wRatios = [1, 0.85, 0.75, 0.618, 0.5];

    var out = [];
    var y = topEdge;
    for (var i = 0; i < primaryCount; i++) {
        var h = heights[i];
        var w = availWide * wRatios[R.random_int(0, wRatios.length - 1)];
        // Mostly centered; occasional small offset for rhythm
        var xOffset = 0;
        if (R.random_dec() < 0.35) {
            xOffset = (R.random_dec() - 0.5) * (availWide - w) * 0.5;
        }
        var x = leftEdge + (availWide - w) / 2 + xOffset;
        x = Math.max(leftEdge, Math.min(rightEdge - w, x));

        var primary = makePrimary(x, y, w, h);
        var nested = makeNest(primary, pickNestLevels(0.70));
        for (var j = 0; j < nested.length; j++) out.push(nested[j]);
        y += h + safeGap;
    }
    return out;
}

function buildStacked(count) {
    var topEdge = framewidth + safeGap;
    var bottomEdge = high - framewidth - safeGap;
    var leftEdge = framewidth + safeGap;
    var rightEdge = wide - framewidth - safeGap;
    var availHigh = bottomEdge - topEdge;
    var axisX = (leftEdge + rightEdge) / 2;
    // Each column occupies the left/right half minus a safeGap down the middle
    var colWide = (axisX - safeGap / 2 - leftEdge);
    var colLeftCenter = leftEdge + colWide / 2;

    var primaryCount = Math.max(3, Math.min(Math.floor(2 + count / 3), 5));
    var heights = proportionalHeights(primaryCount, availHigh, safeGap);

    var wRatios = [1, 0.85, 0.75, 0.618];

    var out = [];
    var y = topEdge;
    for (var i = 0; i < primaryCount; i++) {
        var h = heights[i];
        var w = colWide * wRatios[R.random_int(0, wRatios.length - 1)];
        var x = colLeftCenter - w / 2;

        var primary = makePrimary(x, y, w, h);
        var nested = makeNest(primary, pickNestLevels(0.55));
        for (var j = 0; j < nested.length; j++) {
            out.push(nested[j]);
            out.push(mirrorEntry(nested[j], axisX));
        }
        y += h + safeGap;
    }
    return out;
}

function buildCluster(count) {
    var topEdge = framewidth + safeGap;
    var bottomEdge = high - framewidth - safeGap;
    var leftEdge = framewidth + safeGap;
    var rightEdge = wide - framewidth - safeGap;
    var availHigh = bottomEdge - topEdge;
    var availWide = rightEdge - leftEdge;

    // Coarse grid for alignment — shapes snap to grid cells so the composition
    // reads as intentional rather than scatter-random
    var gridCols = 5;
    var gridRows = Math.max(4, Math.round(availHigh / (availWide / gridCols)));
    var cellW = availWide / gridCols;
    var cellH = availHigh / gridRows;

    var targetPrimaries = Math.max(3, Math.min(Math.floor(2 + count / 2), 6));

    var occupied = {};
    function occupy(gx, gy, gw, gh) {
        for (var x = gx; x < gx + gw; x++)
            for (var y = gy; y < gy + gh; y++)
                occupied[x + ',' + y] = true;
    }
    function isFree(gx, gy, gw, gh) {
        if (gx < 0 || gy < 0 || gx + gw > gridCols || gy + gh > gridRows) return false;
        for (var x = gx; x < gx + gw; x++)
            for (var y = gy; y < gy + gh; y++)
                if (occupied[x + ',' + y]) return false;
        return true;
    }

    var out = [];

    function placeAt(gx, gy, gw, gh, nestProb) {
        var x = leftEdge + gx * cellW + safeGap / 2;
        var y = topEdge + gy * cellH + safeGap / 2;
        var w = gw * cellW - safeGap;
        var h = gh * cellH - safeGap;
        if (w < safeGap * 2 || h < safeGap * 2) return false;
        var primary = makePrimary(x, y, w, h);
        var nested = makeNest(primary, pickNestLevels(nestProb));
        for (var j = 0; j < nested.length; j++) out.push(nested[j]);
        occupy(gx, gy, gw, gh);
        return true;
    }

    // Anchor — a chunky element near the center
    var anchorChoices = [
        { w: Math.min(3, gridCols), h: Math.min(3, gridRows) },
        { w: Math.min(2, gridCols), h: Math.min(3, gridRows) },
        { w: Math.min(3, gridCols), h: Math.min(2, gridRows) }
    ];
    var anchor = anchorChoices[R.random_int(0, anchorChoices.length - 1)];
    var ax = Math.floor((gridCols - anchor.w) / 2);
    var ay = Math.floor((gridRows - anchor.h) / 2);
    placeAt(ax, ay, anchor.w, anchor.h, 0.55);
    var placed = 1;

    // Satellites — 1x1, 1x2, 2x1, or 2x2 cells at random free positions
    var attempts = 0;
    while (placed < targetPrimaries && attempts < 200) {
        attempts++;
        var sw = (R.random_dec() < 0.65) ? 1 : 2;
        var sh = (R.random_dec() < 0.65) ? 1 : 2;
        var sx = R.random_int(0, Math.max(0, gridCols - sw));
        var sy = R.random_int(0, Math.max(0, gridRows - sh));
        if (isFree(sx, sy, sw, sh)) {
            if (placeAt(sx, sy, sw, sh, 0.35)) placed++;
        }
    }
    return out;
}

function pickShapeType(w, h) {
    var ratio = Math.min(w, h) / Math.max(w, h);
    var squarish = ratio > 0.8;
    var tall     = h > w * 1.1;

    // Weighted pool — biomorphic and geometric MCM primitives mixed.
    var pool = [];
    pool.push('ellipse', 'ellipse');
    pool.push('pill', 'pill');
    pool.push('halfCircle', 'halfCircle', 'halfCircle'); // dome / bowl
    pool.push('rect', 'rect');                           // clean right angles
    pool.push('blob');
    pool.push('lens');
    if (squarish) {
        pool.push('circle', 'circle');
        pool.push('quarter', 'quarter');                 // Bauhaus pie wedge
    }
    if (tall) {
        pool.push('arch', 'arch', 'arch');               // tombstone — signature MCM form
    }
    return pool[R.random_int(0, pool.length - 1)];
}

// Orientation per shape type:
//   halfCircle / quarter → 0-3  (4 rotations)
//   arch                 → 0-1  (upright or inverted)
//   others               → 0    (ignored)
function pickOrient(type) {
    if (type === 'halfCircle' || type === 'quarter') return R.random_int(0, 3);
    if (type === 'arch') return R.random_int(0, 1);
    return 0;
}

// Flip orient under horizontal mirror (about a vertical axis).
function mirrorOrient(type, orient) {
    if (type === 'halfCircle') {
        if (orient === 2) return 3;  // dome-right → dome-left
        if (orient === 3) return 2;  // dome-left  → dome-right
        return orient;               // dome-down / dome-up are symmetric
    }
    if (type === 'quarter') {
        // TL↔TR, BL↔BR
        if (orient === 0) return 1;
        if (orient === 1) return 0;
        if (orient === 2) return 3;
        if (orient === 3) return 2;
    }
    // arch is symmetric about the vertical axis
    return orient;
}

// Build a primary entry at (x, y, w, h) with a randomized type, angle, and orientation.
function makePrimary(x, y, w, h) {
    var type = pickShapeType(w, h);
    return {
        x: x, y: y, w: w, h: h,
        type: type,
        angle: pickAngle(),
        orient: pickOrient(type),
        seed: R.random_dec() * 1000
    };
}

function pickAngle() {
    if ($fx.getParam('rotation') === 'Aligned') return 0;
    // MCM reads calmest when most shapes are axis-aligned. 60% zero-rotation,
    // rest get a gentle ±15° tilt.
    if (R.random_dec() < 0.6) return 0;
    return (R.random_dec() - 0.5) * 30;
}


// ---------- Shape generators ----------
// Each generator draws a biomorphic shape that stays strictly inside the given
// bounding box. makeShape() handles per-layer shrink and optional rotation,
// pre-shrinking to keep the rotated AABB within the original box.

function makeShape(box, shrinkPx) {
    var rw = box.w - shrinkPx * 2;
    var rh = box.h - shrinkPx * 2;
    if (rw < 4 || rh < 4) return null;

    if (box.angle !== 0) {
        var fit = rotatedFit(rw, rh, box.angle);
        rw *= fit;
        rh *= fit;
    }

    var cx = box.x + box.w / 2;
    var cy = box.y + box.h / 2;
    var inner = { x: cx - rw / 2, y: cy - rh / 2, w: rw, h: rh };

    var shape;
    switch (box.type) {
        case 'ellipse':    shape = makeEllipseShape(inner); break;
        case 'pill':       shape = makePillShape(inner); break;
        case 'circle':     shape = makeCircleShape(inner); break;
        case 'lens':       shape = makeLensShape(inner); break;
        case 'blob':       shape = makeBlobShape(inner, box.seed); break;
        case 'rect':       shape = makeRectShape(inner); break;
        case 'halfCircle': shape = makeHalfCircleShape(inner, box.orient); break;
        case 'quarter':    shape = makeQuarterShape(inner, box.orient); break;
        case 'arch':       shape = makeArchShape(inner, box.orient); break;
        default:           shape = makeEllipseShape(inner);
    }

    if (box.angle !== 0 && shape) {
        shape.rotate(box.angle, new Point(cx, cy));
    }
    return shape;
}

function rotatedFit(w, h, angleDeg) {
    var a = angleDeg * Math.PI / 180;
    var ca = Math.abs(Math.cos(a));
    var sa = Math.abs(Math.sin(a));
    var newW = w * ca + h * sa;
    var newH = w * sa + h * ca;
    return Math.min(w / newW, h / newH);
}

function makeEllipseShape(b) {
    return new Path.Ellipse({ point: [b.x, b.y], size: [b.w, b.h] });
}

function makePillShape(b) {
    var r = Math.min(b.w, b.h) / 2;
    return new Path.Rectangle({
        point: [b.x, b.y],
        size: [b.w, b.h],
        radius: r
    });
}

function makeCircleShape(b) {
    var r = Math.min(b.w, b.h) / 2;
    return new Path.Circle(new Point(b.x + b.w / 2, b.y + b.h / 2), r);
}

function makeLensShape(b) {
    var cx = b.x + b.w / 2;
    var cy = b.y + b.h / 2;
    var lens = new Path();
    if (b.w >= b.h) {
        lens.moveTo(new Point(cx - b.w / 2, cy));
        lens.arcTo(new Point(cx, cy - b.h / 2), new Point(cx + b.w / 2, cy));
        lens.arcTo(new Point(cx, cy + b.h / 2), new Point(cx - b.w / 2, cy));
    } else {
        lens.moveTo(new Point(cx, cy - b.h / 2));
        lens.arcTo(new Point(cx + b.w / 2, cy), new Point(cx, cy + b.h / 2));
        lens.arcTo(new Point(cx - b.w / 2, cy), new Point(cx, cy - b.h / 2));
    }
    lens.closed = true;
    return lens;
}

function makeRectShape(b) {
    return new Path.Rectangle({ point: [b.x, b.y], size: [b.w, b.h] });
}

// Dome / bowl — half of an ellipse inscribed in a 2× box, clipped back to `b`.
//   orient 0: dome-down (flat at bottom, round on top)
//   orient 1: dome-up   (flat at top,    round on bottom)
//   orient 2: dome-right(flat at left,   round on right)
//   orient 3: dome-left (flat at right,  round on left)
function makeHalfCircleShape(b, orient) {
    var ellipse, mask;
    if (orient === 1) {
        // flat top → ellipse extends upward out of box
        ellipse = new Path.Ellipse({ point: [b.x, b.y - b.h], size: [b.w, b.h * 2] });
    } else if (orient === 2) {
        // flat left → ellipse extends leftward out of box
        ellipse = new Path.Ellipse({ point: [b.x - b.w, b.y], size: [b.w * 2, b.h] });
    } else if (orient === 3) {
        // flat right → ellipse extends rightward out of box
        ellipse = new Path.Ellipse({ point: [b.x, b.y], size: [b.w * 2, b.h] });
    } else {
        // default: flat bottom → ellipse extends downward out of box
        ellipse = new Path.Ellipse({ point: [b.x, b.y], size: [b.w, b.h * 2] });
    }
    mask = new Path.Rectangle({ point: [b.x, b.y], size: [b.w, b.h] });
    var shape = clipIntersect(ellipse, mask);
    ellipse.remove();
    mask.remove();
    return shape;
}

// 90° pie wedge with the pivot at one corner of `b`.
//   orient 0: pivot at TL (wedge fills TL quadrant)
//   orient 1: pivot at TR
//   orient 2: pivot at BR
//   orient 3: pivot at BL
function makeQuarterShape(b, orient) {
    var r = Math.min(b.w, b.h);
    var cx, cy, rx, ry;
    if (orient === 0)       { cx = b.x;       cy = b.y;       rx = b.x;         ry = b.y; }
    else if (orient === 1)  { cx = b.x + b.w; cy = b.y;       rx = b.x + b.w - r; ry = b.y; }
    else if (orient === 2)  { cx = b.x + b.w; cy = b.y + b.h; rx = b.x + b.w - r; ry = b.y + b.h - r; }
    else                    { cx = b.x;       cy = b.y + b.h; rx = b.x;         ry = b.y + b.h - r; }

    var circle = new Path.Circle(new Point(cx, cy), r);
    var mask = new Path.Rectangle({ point: [rx, ry], size: [r, r] });
    var quarter = clipIntersect(circle, mask);
    circle.remove();
    mask.remove();
    return quarter;
}

// Tombstone / arch: rectangular body with a semicircular cap on one end.
// Dome radius = w/2 so the cap is a true semicircle. If h < w/2 the body
// collapses and the shape falls back to a bare dome.
//   orient 0: upright  (cap at top,    legs at bottom)
//   orient 1: inverted (cap at bottom, legs at top)
function makeArchShape(b, orient) {
    var domeH = Math.min(b.w / 2, b.h);
    var bodyH = b.h - domeH;
    var body = null, dome;
    if (orient === 1) {
        // inverted: body on top, cap on bottom
        if (bodyH > 0) {
            body = new Path.Rectangle({ point: [b.x, b.y], size: [b.w, bodyH] });
        }
        var fe = new Path.Ellipse({ point: [b.x, b.y + bodyH - domeH], size: [b.w, domeH * 2] });
        var fm = new Path.Rectangle({ point: [b.x, b.y + bodyH], size: [b.w, domeH] });
        dome = clipIntersect(fe, fm);
        fe.remove(); fm.remove();
    } else {
        // upright: cap on top, body on bottom
        if (bodyH > 0) {
            body = new Path.Rectangle({ point: [b.x, b.y + domeH], size: [b.w, bodyH] });
        }
        var fe = new Path.Ellipse({ point: [b.x, b.y], size: [b.w, domeH * 2] });
        var fm = new Path.Rectangle({ point: [b.x, b.y], size: [b.w, domeH] });
        dome = clipIntersect(fe, fm);
        fe.remove(); fm.remove();
    }
    if (body) {
        var arch = clipUnite(body, dome);
        body.remove();
        dome.remove();
        return arch;
    }
    return dome;
}

function makeBlobShape(b, seedOffset) {
    var cx = b.x + b.w / 2;
    var cy = b.y + b.h / 2;
    var perturbAmp = 0.15;
    // Shrink base radii so worst-case wobble still fits in box
    var rx = (b.w / 2) / (1 + perturbAmp);
    var ry = (b.h / 2) / (1 + perturbAmp);
    var steps = 64;
    var blob = new Path();
    var so = seedOffset * 0.01;
    for (var i = 0; i < steps; i++) {
        var theta = (i / steps) * Math.PI * 2;
        var n = noise.get(
            Math.cos(theta) * 0.6 + so,
            Math.sin(theta) * 0.6 + so,
            so * 0.5
        );
        var wobble = 1 + (n - 0.5) * 2 * perturbAmp;
        blob.add(new Point(
            cx + Math.cos(theta) * rx * wobble,
            cy + Math.sin(theta) * ry * wobble
        ));
    }
    blob.closed = true;
    blob.smooth();
    return blob;
}


//^^^^^^^^^^^^^ END PROJECT FUNCTIONS ^^^^^^^^^^^^^




//--------- Helper functions ----------------------- 

function floatingframe(){
    var frameWide=~~(34*ratio);var frameReveal = ~~(12*ratio);
  if (framegap.isEmpty()){
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(~~(wide+frameReveal*2), ~~(high+frameReveal*2)), framradius)
        var insideframe = new Path.Rectangle(new Point(frameReveal, frameReveal),new Size(wide, high)) 
        framegap = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        framegap.scale(2.2);
        framegap.position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
        framegap.style = {fillColor: '#1A1A1A', strokeColor: "#1A1A1A", strokeWidth: 1*ratio};
    } else {framegap.removeChildren()} 
    
    if (woodframe.isEmpty()){
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide+frameWide*2+frameReveal*2, high+frameWide*2+frameReveal*2), framradius)
        var insideframe = new Path.Rectangle(new Point(frameWide, frameWide),new Size(wide+frameReveal*2, high+frameReveal*2)) 
        woodframe = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        woodframe.scale(2.2);
        woodframe.position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
        var framegroup = new Group(woodframe);
        woodframe.style = {fillColor: frameColor, strokeColor: "#60513D", strokeWidth: 2*ratio,shadowColor: new Color(0,0,0,[0.5]),shadowBlur: 20,shadowOffset: new Point(10*2.2, 10*2.2)};
    } else {woodframe.removeChildren()} 
    //fileName = "Framed-"+$fx.hash;
}

function rangeInt(range,x,y,z){
    var v = ~~(range-(noise.get(x,y,z)*range*2));
    return (v);
}

// Add shape s to sheet z
function join(z,s){
    var old = sheet[z];
    sheet[z] = clipUnite(s, sheet[z]);
    old.remove();
    s.remove();
}

// Subtract shape s from sheet z
function cut(z,s){
    var old = sheet[z];
    sheet[z] = clipSubtract(sheet[z], s);
    old.remove();
    s.remove();
}

function drawFrame(z){
    var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
    var insideframe = new Path.Rectangle(new Point(framewidth, framewidth),new Size(wide-framewidth*2, high-framewidth*2)) 
    //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
    //var insideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2-framewidth);


    sheet[z] = clipSubtract(outsideframe, insideframe);
    outsideframe.remove();insideframe.remove();
}


function solid(z){
    outsideframe = new Path.Rectangle(new Point(1,1),new Size(wide-1, high-1), framradius)
    //outsideframe = new Path.Circle(new Point(wide/2),wide/2)
    var old = sheet[z];
    sheet[z] = clipUnite(sheet[z], outsideframe);
    old.remove();
    outsideframe.remove();
}



function frameIt(z){
        //Trim to size
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
        //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
        var old = sheet[z];
        sheet[z] = clipIntersect(outsideframe, sheet[z]);
        old.remove();
        outsideframe.remove();

        //Make sure there is still a solid frame
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
        var insideframe = new Path.Rectangle(new Point(framewidth, framewidth),new Size(wide-framewidth*2, high-framewidth*2))
        //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
        //var insideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2-framewidth);

        var frame = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        var old = sheet[z];
        sheet[z] = clipUnite(sheet[z], frame);
        old.remove();
        frame.remove();
         
        
        sheet[z].style = {fillColor: colors[z].Hex, strokeColor: linecolor.Hex, strokeWidth: 1*ratio,shadowColor: new Color(0,0,0,[0.3]),shadowBlur: 20,shadowOffset: new Point((stacks-z)*2.3, (stacks-z)*2.3)};
}

function cutMarks(z){
    if (z<stacks-1 && z!=0) {
          for (etch=0;etch<stacks-z;etch++){
                var layerEtch = new Path.Circle(new Point(50+etch*10,25),2)
                cut(z,layerEtch)
            } 
        }
}

function signature(z){
    shawn = new CompoundPath(sig);
    shawn.strokeColor = 'green';
    shawn.fillColor = 'green';
    shawn.strokeWidth = 1;
    shawn.scale(ratio*.9)
    shawn.position = new Point(wide-framewidth-~~(shawn.bounds.width/2), high-framewidth+~~(shawn.bounds.height));
    cut(z,shawn)
}

function hanger (z){
    if (z < stacks-2 && scale>0){
        var r = 30*ratio;
        rt = 19*ratio;
        if (z<3){r = 19*ratio}
        layerEtch = new Path.Rectangle(new Point(framewidth/2, framewidth),new Size(r*2, r*3), r)
        layerEtch.position = new Point(framewidth/2,framewidth);   
        cut(z,layerEtch)

        layerEtch = new Path.Rectangle(new Point(wide-framewidth/2, framewidth),new Size(r*2, r*3), r)
        layerEtch.position = new Point(wide-framewidth/2,framewidth);   
        cut(z,layerEtch)

        layerEtch = new Path.Rectangle(new Point(wide/2, framewidth/2),new Size(r*4, r*2), r)
        layerEtch.position = new Point(wide/2,framewidth/2);   
        cut(z,layerEtch)
    }
}




//--------- Interaction functions -----------------------
var interactiontext = "Interactions\nB = Blueprint mode\nV = Export SVG\nP = Export PNG\nC = Export colors as TXT\nE = Show layers\nF = Add floating frame\nL = Format for plotting"

view.onDoubleClick = function(event) {
    alert(interactiontext);
    console.log(project.exportJSON());
    //canvas.toBlob(function(blob) {saveAs(blob, tokenData.hash+'.png');});
};

document.addEventListener('keypress', (event) => {

       //Save as SVG 
       if(event.key == "v") {
            var url = "data:image/svg+xml;utf8," + encodeURIComponent(paper.project.exportSVG({asString:true}));
            var key = [];for (l=stacks;l>0;l--){key[stacks-l] = colors[l-1].Name;}; 
            var svg1 = "<!--"+key+"-->" + paper.project.exportSVG({asString:true})
            var url = "data:image/svg+xml;utf8," + encodeURIComponent(svg1);
            var link = document.createElement("a");
            link.download = fileName;
            link.href = url;
            link.click();
            }


        if(event.key == "f") {
            floatingframe();
            
        }
        
        if(event.key == "1") {
            frameColor = {"Hex":"#4C46380", "Name":"Black"};
            fileName = "FramedBlack-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "2") {
            frameColor = {"Hex":"#f9f9f9","Name":"White"};
            fileName = "FramedWhite-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "3") {
            frameColor = {"Hex":"#60513D","Name":"Walnut"};
            fileName = "FramedWalnut-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "4") {
            frameColor = {"Hex":"#ebd9c0","Name":"Maple"};
            fileName = "FramedMaple-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
            
        if(event.key == "V") {
            fileName = "Vector-"+$fx.hash;
        }  


       //Format for Lightburn
       if(event.key == "b") {
        fileName = "blueprint-"+$fx.hash;
            for (z=0;z<stacks;z++){
                sheet[z].style = {fillColor: null,strokeWidth: .1,strokeColor: lightburn[stacks-z-1].Hex,shadowColor: null,shadowBlur: null,shadowOffset: null}
                sheet[z].selected = true;}
            }

       //Format for plotting
       if(event.key == "l") {
            fileName = "Plotting-"+$fx.hash;

            for (z=0;z<stacks;z++){
            sheet[z].style = {fillColor: null,strokeWidth: .1,strokeColor: plottingColors[stacks-z-1].Hex,shadowColor: null,shadowBlur: null,shadowOffset: null}
            sheet[z].selected = true;
            }
        
            for (z=0;z<stacks;z++){
                if (z<stacks-1){
                    for (zs=z+1;zs<stacks;zs++){
                        var old = sheet[z];
                        sheet[z] = clipSubtract(sheet[z], sheet[zs]);
                        old.remove();
                    }
                }
                console.log("optimizing")
            }
        }

        //new hash
        if(event.key == " ") {
            setquery("fxhash",null);
            location.reload();
            }

        //help
       if(event.key == "h" || event.key == "/") {
            alert(interactiontext);
            }
             
        //Save as PNG
        if(event.key == "p") {
            canvas.toBlob(function(blob) {saveAs(blob, fileName+'.png');});
            }

        //Export colors as txt
        if(event.key == "c") {
            content = JSON.stringify(features,null,2);
            console.log(content);
            var filename = "Colors-"+$fx.hash + ".txt";
            var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
            saveAs(blob, filename);
            }

        //send to studio.shawnkemp.art
        if(event.key == "s") {
            sendAllExports()
            }  

       //Explode the layers     
       if(event.key == "e") {   
            //floatingframe();  
            h=0;t=0;maxwidth=3000;
               for (z=0; z<sheet.length; z++) { 
               sheet[z].scale(1000/2300)   
               sheet[z].position = new Point(wide/2,high/2);        
                    sheet[z].position.x += wide*h;
                    sheet[z].position.y += high*t;
                    sheet[z].selected = true;
                    if (wide*(h+2) > panelWide) {maxwidth=wide*(h+1);h=0;t++;} else{h++};
                    }  
            paper.view.viewSize.width = maxwidth;
            paper.view.viewSize.height = high*(t+1);
           }
 
}, false); 
}