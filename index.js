
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
var qcolors = R.random_int(1,12);
if(new URLSearchParams(window.location.search).get('c')){qcolors = new URLSearchParams(window.location.search).get('c')}; //number of colors
var qsize = "2";
if(new URLSearchParams(window.location.search).get('s')){qsize = new URLSearchParams(window.location.search).get('s')}; //size
var qcomplexity = R.random_int(1,10);
if(new URLSearchParams(window.location.search).get('d')){qcomplexity = new URLSearchParams(window.location.search).get('d')}; //size
qcomplexity = qcomplexity+3;

var qorientation =R.random_int(1,2) < 2 ? "portrait" : "landscape";
var qframecolor = R.random_int(0,3) < 1 ? "White" : R.random_int(1,3) < 2 ? "Mocha" : "Random";     
qframecolor = "white";
var qmatwidth = R.random_int(50,100);
var qlayout = ["Totem", "Banded", "Stacked", "Cluster", "Arch", "Grid"][R.random_int(0,5)];
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
            max: 12,
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
        default: "White",
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
        options: {options: ["Totem", "Banded", "Stacked", "Cluster", "Arch", "Grid"]},
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
else if (layoutMode === 'Arch')     composition = buildArch(density);
else if (layoutMode === 'Grid')     composition = buildGrid(density);

// Per-hash shrink curve: controls how quickly each shape closes as it goes
// deeper. Every shape fully closes by its deepest cut layer — this only
// controls the *rate*. Low values = fast initial shrink (wide surface rings
// that tighten quickly); high values = slow then fast (thin surface rings,
// dramatic pinch at the end).
var shrinkCurve = 0.3 + R.random_dec() * 2.2; // range [0.3, 2.5]


var features = {};
var renderTime;

paper.view.autoUpdate = false;

(async () => {

// Clipper "cold-start" warm-up: the very first boolean op silently returns an
// empty result if it runs before paper.js has yielded/rendered once. Force a
// render + microtask yield here so the first real op (drawFrame on z=0) isn't
// the cold one, which otherwise drops the bottom layer (renders one short).
paper.view.update();
await new Promise(resolve => setTimeout(resolve, 0));

//---- Draw the Layers


for (z = 0; z < stacks; z++) {
    pz = z * prange;

    drawFrame(z); // every layer gets the frame ring
    solid(z);     // solid interior on every layer (including the top)

    for (i = 0; i < composition.length; i++) {
        var box = composition[i];
        // Depth gate: shape is cut on layer z iff the distance from the
        // topmost layer is less than the shape's depth.
        //   depth = 1        → cuts only stacks-1 (surface)
        //   depth = stacks   → cuts every layer (through-cut)
        if ((stacks - 1 - z) >= box.depth) continue;

        var minDim = Math.min(box.w, box.h);
        // How far into this shape's depth range is this layer? 0 at the
        // surface, approaching 1 at the deepest cut. The shape always fully
        // closes (zshrink = minDim/2) at its deepest layer. shrinkCurve
        // controls the rate: <1 = fast initial shrink, 1 = linear, >1 = slow
        // then fast pinch at the end.
        var layerInDepth = (stacks - 1 - z);
        var shrinkFraction = layerInDepth / box.depth;    // 0 at surface, ~1 at deepest
        var zshrink = ~~(Math.pow(shrinkFraction, shrinkCurve) * (minDim / 2));

        var shape = makeShape(box, zshrink);
        if (shape) cut(z, shape);
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
// every shape to cut as deep as possible; "On" picks a tiered depth so some
// shapes sit shallow and others cut deep. Max depth is stacks-1 so the
// bottom layer (z=0) always stays solid — it's the back plate of the piece.
//   depth = 1         → surface cut on the top layer only
//   depth = stacks-1  → cuts every layer except the bottom
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
    // Cap at stacks-1 so the bottom layer stays solid — no through-cuts.
    var maxDepth = Math.max(1, stacks - 1);

    if (levels === 0) {
        out.push({
            x: box.x, y: box.y, w: box.w, h: box.h,
            type: box.type, angle: box.angle, orient: box.orient, seed: box.seed,
            blobArchetype: box.blobArchetype,
            blobPhase: box.blobPhase,
            blobLobes: box.blobLobes,
            blobSeed: box.blobSeed,
            starPoints: box.starPoints,
            depth: pickDepth()
        });
        return out;
    }

    // Default nest: outer shallow, each level steps deeper, center-anchored.
    var baseDepth = R.random_int(1, 3);
    var depthStep = R.random_int(1, 3);
    var shrinkStep = 0.22 + R.random_dec() * 0.12;
    var minShrink  = 0.28;     // stop nesting when scale drops below this
    var isArch = (box.type === 'arch');

    // Arch-specific overrides — produce the classic MCM rainbow stripe look:
    //   - tighter shrink (10-15% per ring) → many thin parallel stripes
    //   - depth step of exactly 1          → each ring reveals the next layer color
    //   - shared baseline (bottom-anchor for upright, top-anchor for inverted)
    //     so the nested rings look like concentric arches springing from a
    //     common base, not arches floating in the middle of the box.
    if (isArch) {
        baseDepth  = 1;
        depthStep  = 1;
        shrinkStep = 0.10 + R.random_dec() * 0.05;
        minShrink  = 0.15;
    }

    var variationOff = $fx.getParam('variation') === 'Off';

    for (var i = 0; i <= levels; i++) {
        var s = 1 - i * shrinkStep;
        if (s <= minShrink) break;
        var w = box.w * s;
        var h = box.h * s;

        // Anchor strategy
        var nx, ny;
        if (isArch) {
            // Horizontally centered in the parent
            nx = box.x + (box.w - w) / 2;
            // Vertically: orient 0 (upright) bottom-anchored, orient 1 top-anchored
            ny = (box.orient === 1) ? box.y : (box.y + box.h - h);
        } else {
            // Default: center-anchored
            nx = (box.x + box.w / 2) - w / 2;
            ny = (box.y + box.h / 2) - h / 2;
        }

        var depth = variationOff ? maxDepth : Math.min(maxDepth, baseDepth + i * depthStep);
        out.push({
            x: nx, y: ny, w: w, h: h,
            type: box.type,      // same type as parent for concentric read
            angle: box.angle,    // same angle so rings stay aligned
            orient: box.orient,  // same orientation for concentric dome/arch/quarter
            seed: box.seed + i * 7.3,
            // Blob / starburst variant params pass through unchanged so
            // nested concentric shapes trace the SAME profile just scaled.
            blobArchetype: box.blobArchetype,
            blobPhase: box.blobPhase,
            blobLobes: box.blobLobes,
            blobSeed: box.blobSeed,
            starPoints: box.starPoints,
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
        // Flip blob phase so kidney dents / peanut waists mirror correctly.
        // Fractal blobs (archetype 0) will still differ slightly between pairs
        // since we don't mirror the noise field itself — that's acceptable.
        blobArchetype: entry.blobArchetype,
        blobPhase: entry.blobPhase !== undefined ? -entry.blobPhase : undefined,
        blobLobes: entry.blobLobes,
        blobSeed: entry.blobSeed,
        starPoints: entry.starPoints,
        depth: entry.depth
    };
}

function pickNestLevels(probability, type) {
    if (R.random_dec() >= probability) return 0;
    // Arches get deep nesting so the rainbow stripe look reads.
    if (type === 'arch') return R.random_int(4, 7);
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
        var nested = makeNest(primary, pickNestLevels(0.65, primary.type));
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
        var nested = makeNest(primary, pickNestLevels(0.70, primary.type));
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
        var nested = makeNest(primary, pickNestLevels(0.55, primary.type));
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
        var nested = makeNest(primary, pickNestLevels(nestProb, primary.type));
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

// Hero rainbow arch — single dominant arch filling most of the canvas with
// its feet on the bottom edge and many tightly-spaced concentric rings.
// This is the canonical MCM "rainbow arch" composition.
function buildArch(count) {
    var topEdge = framewidth + safeGap;
    var bottomEdge = high - framewidth - safeGap;
    var leftEdge = framewidth + safeGap;
    var rightEdge = wide - framewidth - safeGap;
    var availHigh = bottomEdge - topEdge;
    var availWide = rightEdge - leftEdge;

    // Width 75-92% of available, height 85-100%, anchored to the bottom edge
    var w = availWide * (0.75 + R.random_dec() * 0.17);
    var h = availHigh * (0.85 + R.random_dec() * 0.15);
    var x = leftEdge + (availWide - w) / 2;
    var y = topEdge + availHigh - h; // bottom-anchored

    // Force arch type — bypass pickShapeType so the layout always delivers.
    var primary = {
        x: x, y: y, w: w, h: h,
        type: 'arch',
        angle: 0,    // axis-aligned for rainbow purity
        orient: 0,   // upright (cap on top, legs at bottom)
        seed: R.random_dec() * 1000
    };

    // Nest level scales loosely with density param
    var levels = Math.max(4, Math.min(8, Math.floor(2 + count / 2)));
    return makeNest(primary, levels);
}

// Bauhaus tile grid — uniform square cells, each with a quarter-circle (or
// occasionally halfCircle / circle) at a random corner. Classic MCM tile look.
// Perlin noise drives orientation and type so nearby cells are spatially
// coherent — adjacent quarter-circles flow into S-curves, full circles, and
// petal shapes instead of looking like random scatter.
function buildGrid(count) {
    var margin = minOffset * 2;
    var topEdge = framewidth + margin;
    var bottomEdge = high - framewidth - margin;
    var leftEdge = framewidth + margin;
    var rightEdge = wide - framewidth - margin;
    var availHigh = bottomEdge - topEdge;
    var availWide = rightEdge - leftEdge;

    // Column count from density, rows from aspect ratio → square cells
    var cols = Math.max(3, Math.min(count, 8));
    var cellSize = availWide / cols;
    var rows = Math.max(2, Math.floor(availHigh / cellSize));
    cellSize = Math.min(availWide / cols, availHigh / rows);

    // Center the grid in the drawable area
    var gridW = cols * cellSize;
    var gridH = rows * cellSize;
    var startX = leftEdge + (availWide - gridW) / 2;
    var startY = topEdge + (availHigh - gridH) / 2;

    // Tight grout line — just enough for material integrity between cells
    var gridGap = minOffset * 1.5;

    // Perlin noise for spatially-coherent orientation and type selection.
    // Nearby cells get similar noise values → similar orientations → the
    // quarter-circles flow into each other forming S-curves, full circles,
    // and petal shapes. noiseScale controls coherence: low = large smooth
    // regions, high = more local variation.
    var noiseScale = 0.3 + R.random_dec() * 0.5;
    var noiseOffX = R.random_dec() * 100;
    var noiseOffY = R.random_dec() * 100;

    var out = [];
    for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
            var x = startX + col * cellSize + gridGap / 2;
            var y = startY + row * cellSize + gridGap / 2;
            var w = cellSize - gridGap;
            var h = cellSize - gridGap;
            if (w < minOffset * 2 || h < minOffset * 2) continue;

            // Orientation from noise — creates flowing coherent patterns
            var nOrient = noise.get(
                col * noiseScale + noiseOffX,
                row * noiseScale + noiseOffY, 0
            );
            // Shape type from a separate noise region
            var nType = noise.get(
                col * noiseScale + noiseOffX + 50,
                row * noiseScale + noiseOffY + 50, 0
            );

            var type, orient;
            if (nType > 0.85) {
                type = 'circle';
                orient = 0;
            } else if (nType > 0.72) {
                type = 'halfCircle';
                orient = Math.floor(nOrient * 4) % 4;
            } else {
                type = 'quarter';
                orient = Math.floor(nOrient * 4) % 4;
            }

            out.push({
                x: x, y: y, w: w, h: h,
                type: type,
                angle: 0,
                orient: orient,
                seed: R.random_dec() * 1000,
                depth: pickDepth()
            });
        }
    }
    return out;
}

function pickShapeType(w, h) {
    var ratio = Math.min(w, h) / Math.max(w, h);
    var squarish = ratio > 0.8;
    var tall     = h > w * 1.1;
    var wide     = w > h * 1.1;

    // Weighted pool — biomorphic and geometric MCM primitives mixed.
    var pool = [];
    pool.push('ellipse', 'ellipse');
    pool.push('pill', 'pill');
    pool.push('halfCircle', 'halfCircle', 'halfCircle'); // dome / bowl
    pool.push('rect', 'rect');                           // clean right angles
    pool.push('blob');
    pool.push('lens');
    pool.push('boomerang', 'boomerang');                 // curved MCM band
    pool.push('triangle', 'triangle');                   // pennant / wedge
    if (squarish) {
        pool.push('circle', 'circle');
        pool.push('quarter', 'quarter');                 // Bauhaus pie wedge
        pool.push('diamond');                            // rhombus accent
        pool.push('starburst');                          // 4/6/8-point sparkle
        pool.push('plus');                               // cross accent
    }
    if (tall) {
        pool.push('arch', 'arch', 'arch');               // tombstone — signature MCM form
    }
    if (wide) {
        pool.push('parallelogram');                      // slanted-rect accent
    }
    return pool[R.random_int(0, pool.length - 1)];
}

// Orientation per shape type:
//   halfCircle / quarter / triangle / boomerang → 0-3  (4 rotations)
//   arch / parallelogram                        → 0-1
//   others (diamond, plus, starburst, etc.)     → 0    (rotationally symmetric)
function pickOrient(type) {
    if (type === 'halfCircle' || type === 'quarter' ||
        type === 'triangle'   || type === 'boomerang') {
        return R.random_int(0, 3);
    }
    if (type === 'arch' || type === 'parallelogram') return R.random_int(0, 1);
    return 0;
}

// Flip orient under horizontal mirror (about a vertical axis).
function mirrorOrient(type, orient) {
    if (type === 'halfCircle') {
        if (orient === 2) return 3;  // dome-right → dome-left
        if (orient === 3) return 2;
        return orient;               // dome-down / dome-up symmetric
    }
    if (type === 'quarter') {
        // TL↔TR, BL↔BR
        if (orient === 0) return 1;
        if (orient === 1) return 0;
        if (orient === 2) return 3;
        if (orient === 3) return 2;
    }
    if (type === 'triangle') {
        // up/down symmetric, left↔right
        if (orient === 2) return 3;
        if (orient === 3) return 2;
        return orient;
    }
    if (type === 'boomerang') {
        // curves-up/down symmetric, curves-left↔curves-right
        if (orient === 2) return 3;
        if (orient === 3) return 2;
        return orient;
    }
    if (type === 'parallelogram') {
        // slant-right ↔ slant-left
        return orient === 0 ? 1 : 0;
    }
    // arch, diamond, plus, starburst — symmetric about vertical axis
    return orient;
}

// Build a primary entry at (x, y, w, h) with a randomized type, angle, and orientation.
function makePrimary(x, y, w, h) {
    var type = pickShapeType(w, h);
    var entry = {
        x: x, y: y, w: w, h: h,
        type: type,
        angle: pickAngle(),
        orient: pickOrient(type),
        seed: R.random_dec() * 1000
    };
    if (type === 'blob') {
        // Lock blob variant at build time so concentric nested blobs render
        // as true rings (same archetype, phase, and noise seed — just scaled).
        entry.blobArchetype = R.random_int(0, 3); // 0=fractal 1=kidney 2=peanut 3=flower
        entry.blobPhase = R.random_dec() * Math.PI * 2;
        entry.blobLobes = R.random_int(3, 5);
        entry.blobSeed = R.random_dec() * 1000;
    }
    if (type === 'starburst') {
        // 4 / 6 / 8 points — locked at build time so nested starbursts stay
        // concentric (same point count, same phase).
        entry.starPoints = [4, 6, 8][R.random_int(0, 2)];
    }
    return entry;
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
        case 'ellipse':       shape = makeEllipseShape(inner); break;
        case 'pill':          shape = makePillShape(inner); break;
        case 'circle':        shape = makeCircleShape(inner); break;
        case 'lens':          shape = makeLensShape(inner); break;
        case 'blob':          shape = makeBlobShape(inner, box.blobSeed, box.blobArchetype, box.blobPhase, box.blobLobes); break;
        case 'rect':          shape = makeRectShape(inner); break;
        case 'halfCircle':    shape = makeHalfCircleShape(inner, box.orient); break;
        case 'quarter':       shape = makeQuarterShape(inner, box.orient); break;
        case 'arch':          shape = makeArchShape(inner, box.orient); break;
        case 'boomerang':     shape = makeBoomerangShape(inner, box.orient); break;
        case 'triangle':      shape = makeTriangleShape(inner, box.orient); break;
        case 'diamond':       shape = makeDiamondShape(inner); break;
        case 'parallelogram': shape = makeParallelogramShape(inner, box.orient); break;
        case 'plus':          shape = makePlusShape(inner); break;
        case 'starburst':     shape = makeStarburstShape(inner, box.starPoints || 4); break;
        default:              shape = makeEllipseShape(inner);
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

// Boomerang — curved band, built as a dome minus a smaller concentric dome
// sharing the same baseline. Arms taper outward (not perfectly uniform), which
// matches classic MCM boomerang silhouettes. Four orientations.
function makeBoomerangShape(b, orient) {
    var thickX = b.w * 0.28;
    var thickY = b.h * 0.32;
    var outerEll, outerMask, innerEll, innerMask;

    if (orient === 1) {
        // curves down (opening up) — flat top
        outerEll = new Path.Ellipse({ point: [b.x, b.y - b.h], size: [b.w, b.h * 2] });
        outerMask = new Path.Rectangle({ point: [b.x, b.y], size: [b.w, b.h] });
        innerEll = new Path.Ellipse({
            point: [b.x + thickX, b.y - (b.h - thickY)],
            size: [b.w - 2 * thickX, (b.h - thickY) * 2]
        });
        innerMask = new Path.Rectangle({
            point: [b.x + thickX, b.y],
            size: [b.w - 2 * thickX, b.h - thickY]
        });
    } else if (orient === 2) {
        // curves right (opening left) — flat left
        outerEll = new Path.Ellipse({ point: [b.x - b.w, b.y], size: [b.w * 2, b.h] });
        outerMask = new Path.Rectangle({ point: [b.x, b.y], size: [b.w, b.h] });
        innerEll = new Path.Ellipse({
            point: [b.x - (b.w - thickX), b.y + thickY],
            size: [(b.w - thickX) * 2, b.h - 2 * thickY]
        });
        innerMask = new Path.Rectangle({
            point: [b.x, b.y + thickY],
            size: [b.w - thickX, b.h - 2 * thickY]
        });
    } else if (orient === 3) {
        // curves left (opening right) — flat right
        outerEll = new Path.Ellipse({ point: [b.x, b.y], size: [b.w * 2, b.h] });
        outerMask = new Path.Rectangle({ point: [b.x, b.y], size: [b.w, b.h] });
        innerEll = new Path.Ellipse({
            point: [b.x + thickX, b.y + thickY],
            size: [(b.w - thickX) * 2, b.h - 2 * thickY]
        });
        innerMask = new Path.Rectangle({
            point: [b.x + thickX, b.y + thickY],
            size: [b.w - thickX, b.h - 2 * thickY]
        });
    } else {
        // default orient 0: curves up (opening down) — flat bottom
        outerEll = new Path.Ellipse({ point: [b.x, b.y], size: [b.w, b.h * 2] });
        outerMask = new Path.Rectangle({ point: [b.x, b.y], size: [b.w, b.h] });
        innerEll = new Path.Ellipse({
            point: [b.x + thickX, b.y + thickY],
            size: [b.w - 2 * thickX, (b.h - thickY) * 2]
        });
        innerMask = new Path.Rectangle({
            point: [b.x + thickX, b.y + thickY],
            size: [b.w - 2 * thickX, b.h - thickY]
        });
    }

    var outer = clipIntersect(outerEll, outerMask);
    outerEll.remove(); outerMask.remove();
    var inner = clipIntersect(innerEll, innerMask);
    innerEll.remove(); innerMask.remove();
    var boom = clipSubtract(outer, inner);
    outer.remove(); inner.remove();
    return boom;
}

function makeTriangleShape(b, orient) {
    var path = new Path();
    if (orient === 1) {
        // pointing down
        path.add(new Point(b.x, b.y));
        path.add(new Point(b.x + b.w, b.y));
        path.add(new Point(b.x + b.w / 2, b.y + b.h));
    } else if (orient === 2) {
        // pointing right
        path.add(new Point(b.x, b.y));
        path.add(new Point(b.x + b.w, b.y + b.h / 2));
        path.add(new Point(b.x, b.y + b.h));
    } else if (orient === 3) {
        // pointing left
        path.add(new Point(b.x + b.w, b.y));
        path.add(new Point(b.x + b.w, b.y + b.h));
        path.add(new Point(b.x, b.y + b.h / 2));
    } else {
        // default orient 0: pointing up
        path.add(new Point(b.x + b.w / 2, b.y));
        path.add(new Point(b.x, b.y + b.h));
        path.add(new Point(b.x + b.w, b.y + b.h));
    }
    path.closed = true;
    return path;
}

function makeDiamondShape(b) {
    var path = new Path();
    path.add(new Point(b.x + b.w / 2, b.y));
    path.add(new Point(b.x + b.w, b.y + b.h / 2));
    path.add(new Point(b.x + b.w / 2, b.y + b.h));
    path.add(new Point(b.x, b.y + b.h / 2));
    path.closed = true;
    return path;
}

function makeParallelogramShape(b, orient) {
    var slant = b.w * 0.22;
    var path = new Path();
    if (orient === 1) {
        // slant left (top edge shifted left)
        path.add(new Point(b.x, b.y));
        path.add(new Point(b.x + b.w - slant, b.y));
        path.add(new Point(b.x + b.w, b.y + b.h));
        path.add(new Point(b.x + slant, b.y + b.h));
    } else {
        // default orient 0: slant right
        path.add(new Point(b.x + slant, b.y));
        path.add(new Point(b.x + b.w, b.y));
        path.add(new Point(b.x + b.w - slant, b.y + b.h));
        path.add(new Point(b.x, b.y + b.h));
    }
    path.closed = true;
    return path;
}

function makePlusShape(b) {
    // 12-vertex cross. Arm thickness = ~33% of the shorter side.
    var arm = Math.min(b.w, b.h) * 0.33;
    var hx = arm / 2;
    var hy = arm / 2;
    var cx = b.x + b.w / 2;
    var cy = b.y + b.h / 2;
    var path = new Path();
    path.add(new Point(cx - hx, b.y));
    path.add(new Point(cx + hx, b.y));
    path.add(new Point(cx + hx, cy - hy));
    path.add(new Point(b.x + b.w, cy - hy));
    path.add(new Point(b.x + b.w, cy + hy));
    path.add(new Point(cx + hx, cy + hy));
    path.add(new Point(cx + hx, b.y + b.h));
    path.add(new Point(cx - hx, b.y + b.h));
    path.add(new Point(cx - hx, cy + hy));
    path.add(new Point(b.x, cy + hy));
    path.add(new Point(b.x, cy - hy));
    path.add(new Point(cx - hx, cy - hy));
    path.closed = true;
    return path;
}

// 4 / 6 / 8 point starburst — alternating outer "tip" and inner "notch"
// vertices around an ellipse. innerR controls spikiness (smaller = sharper).
function makeStarburstShape(b, points) {
    var n = points || 4;
    var cx = b.x + b.w / 2;
    var cy = b.y + b.h / 2;
    var rx = b.w / 2;
    var ry = b.h / 2;
    // 4-point reads as a sparkle (very spiky); 6/8 progressively less spiky.
    var innerR = (n === 4) ? 0.22 : (n === 6) ? 0.34 : 0.42;
    var total = n * 2;
    var path = new Path();
    for (var i = 0; i < total; i++) {
        // Start from the top so the shape feels upright
        var angle = (i / total) * Math.PI * 2 - Math.PI / 2;
        var r = (i % 2 === 0) ? 1 : innerR;
        path.add(new Point(cx + Math.cos(angle) * rx * r, cy + Math.sin(angle) * ry * r));
    }
    path.closed = true;
    return path;
}

// Biomorphic blob. Four archetypes picked at build time and frozen on the box:
//   0 = FRACTAL — multi-octave perlin, puddle/amoeba with real concavities
//   1 = KIDNEY  — single Gaussian dent on one side
//   2 = PEANUT  — 2-lobed dumbbell with a waist
//   3 = FLOWER  — 3-5 lobed rosette
// All archetypes return radial function r(θ) ∈ [~0.1, 1.0] so the curve always
// fits inside the bounding box (after a small safety inset for smooth()).
function makeBlobShape(b, seedOffset, archetype, phase, lobes) {
    var cx = b.x + b.w / 2;
    var cy = b.y + b.h / 2;
    // Small safety inset so Paper's smooth() can't push control handles past
    // the box. 4% is enough in practice for catmull-rom-style smoothing.
    var rx = (b.w / 2) * 0.96;
    var ry = (b.h / 2) * 0.96;
    var steps = 96;
    var blob = new Path();
    var so = (seedOffset || 0) * 0.01;
    var ph = phase || 0;
    var nLobes = lobes || 3;

    for (var i = 0; i < steps; i++) {
        var theta = (i / steps) * Math.PI * 2;
        var ct = Math.cos(theta);
        var st = Math.sin(theta);
        var r;

        if (archetype === 1) {
            // Kidney — one concave Gaussian bite. depth=0.45 gives a clear
            // dent without pinching the curve to zero width.
            var d = theta - ph;
            while (d >  Math.PI) d -= 2 * Math.PI;
            while (d < -Math.PI) d += 2 * Math.PI;
            var sigma = 0.85;
            r = 1 - 0.45 * Math.exp(-d * d / (2 * sigma * sigma));
        } else if (archetype === 2) {
            // Peanut / dumbbell — 2 lobes with a waist. base+amp must equal 1
            // so the peak radius matches the box edge.
            r = 0.72 + 0.28 * Math.cos(2 * (theta - ph));
        } else if (archetype === 3) {
            // Flower — n-lobed rosette. n stored on the box (3/4/5).
            r = 0.76 + 0.24 * Math.cos(nLobes * (theta - ph));
        } else {
            // Fractal — multi-octave perlin gives low-freq big bulges with
            // higher-freq detail riding on top. Range ~[0.30, 1.00].
            var n1 = noise.get(ct * 0.8 + so,        st * 0.8 + so,        0);
            var n2 = noise.get(ct * 2.3 + so + 5.1,  st * 2.3 + so + 5.1,  0);
            var n3 = noise.get(ct * 4.6 + so + 11.7, st * 4.6 + so + 11.7, 0);
            r = 0.65 + (n1 - 0.5) * 0.40 + (n2 - 0.5) * 0.20 + (n3 - 0.5) * 0.10;
        }

        if (r < 0.10) r = 0.10;
        if (r > 1.00) r = 1.00;

        blob.add(new Point(cx + ct * rx * r, cy + st * ry * r));
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