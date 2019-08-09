let nodes = [];
let output = {
  _in: function (thing) {
    console.debug(thing.id + " constructed");
    return true;
  }
};

let plan3 = new ConstructionPlan([new PlanItem("tube", 1), new PlanItem("plastic", 1)],
  [new PlanItem("knife", 2)],
  1000);
let facility3 = buildFacility(110, 110, plan3, 2);

let plan2 = new ConstructionPlan([new PlanItem("iron", 2)],
  [new PlanItem("tube", 1)],
  1000);
let facility2 = buildFacility(110, 300, plan2, 1, facility3);

let plan1 = new ConstructionPlan([new PlanItem("iron-ore", 2)],
  [new PlanItem("iron", 1), new PlanItem("slag", 1)],
  5000);
let facility1 = buildFacility(300, 300, plan1, 2, facility2);

let plasticSource = buildThingSource(10, 50, "plastic", 100, 3000);
let ironOreSource = buildThingSource(350, 370, "iron-ore", 100, 1000);

connect(facility1, facility2, 1, 3000);
connect(facility2, facility3, 1, 3000);
connect(plasticSource, facility3, 1, 1000);
connect(ironOreSource, facility1, 1, 1000);

// Timer.periodic(() => deliver(facility3, new Thing("plastic")), 3000);
// Timer.periodic(() => deliver(facility1, new Thing("iron-ore")), 1000);

/*let div = document.createElement("div");
document.body.appendChild(div);
setInterval(() => {
  div.innerHTML = "<pre>"
    + "Timer: " + (Timer.paused() ? "PAUSED" : "RUN") + "\n\n"
    + "facility1: " + facility1 + "\n\n"
    + "facility2: " + facility2 + "\n\n"
    + "facility3: " + facility3 + "\n\n"
    + "</pre>";
}, 300);*/


function deliver(target, thing) {
  if (!target._in(thing)) message("Dropped " + thing.id);
}

Loop.add(render);
Loop.start();

function render(ctx) {
  nodes.forEach(node => node.draw(ctx));
}

function buildFacility(x, y, plan, capacity, output) {
  output = output || {
      _in: function (thing) {
        console.log(thing.id + " constructed");
        return true;
      }
    };

  let facility = new ConstructionFacility(plan, capacity, output);
  let node = new FacilityNode(facility, x, y);
  facility.node = node;
  nodes.push(node);

  return facility;
}

function buildThingSource(x, y, thingId, capacity, msPerThing) {
  let source = new ThingSource(thingId, capacity, msPerThing);
  let node = new ThingSourceNode(source, x, y);
  source.node = node;
  nodes.push(node);

  return source;
}

function connect(producer, consumer, capacity, fullPassTimeMs) {
  assert(fullPassTimeMs > 0);

  let length = Math.sqrt(Math.pow(producer.node.x - consumer.node.x, 2) + Math.pow(producer.node.y - consumer.node.y, 2));
  let speed = length / fullPassTimeMs;
  let transporter = new Transporter(consumer, length, speed, capacity);
  producer.output = transporter;

  let node = new TransporterNode(transporter, producer.node.x, producer.node.y, consumer.node.x, consumer.node.y);
  transporter.node = node;
  nodes.push(node);

  return transporter;
}