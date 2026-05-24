import moduleAlias = require("module-alias");
import { resolve } from "path";

// Map "@" to the compiled source root (dist or src) at runtime.
moduleAlias.addAlias("@", resolve(__dirname));
