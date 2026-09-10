import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(__dirname, "../../assets/routes.json");
const data = JSON.parse(readFileSync(dataPath, "utf-8"));

export function getRoutes() {
  return data.routes.map((route) => ({
    id: route.id,
    name: route.name,
    description: route.description,
    stops: route.stops,
  }));
}

export function getSchedule(routeName) {
  const route = data.routes.find(
    (r) => r.name.toLowerCase().includes(routeName.toLowerCase()),
  );
  if (!route) return null;
  return {
    route: route.name,
    stops: route.stops,
    schedule: route.schedule,
  };
}

export function getStops(routeName) {
  const route = data.routes.find(
    (r) => r.name.toLowerCase().includes(routeName.toLowerCase()),
  );
  if (!route) return null;
  return { route: route.name, stops: route.stops };
}
