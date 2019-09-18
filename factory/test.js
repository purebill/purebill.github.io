const a = new Thing("a");
const b = new Thing("b");
const c = new Thing("c");
const d = new Thing("d");

let cp = new ConstructionPlan([new PlanItem("a", 1), new PlanItem("b", 2)],
    [], 0);
assert(cp.isRequired([a]));
assert(cp.isRequired([a, b]));
assert(cp.isRequired([a, b, b]));
assert(cp.isRequired([b, a, b]));
assert(!cp.isRequired([a, b, a]));
assert(cp.isRequired([]));

let cp2 = new ConstructionPlan([new PlanItem("a", 1), new PlanItem("b", 2), new PlanItem("*", 2)],
    [], 0);
assert(cp2.isRequired([a]));
assert(cp2.isRequired([a, b]));
assert(cp2.isRequired([a, b, b]));
assert(cp2.isRequired([b, a, b]));
assert(cp2.isRequired([a, b, a]));
assert(cp2.isRequired([a, b, c, d]));
assert(!cp2.isRequired([c, d, c, d]));
assert(cp2.isRequired([]));
