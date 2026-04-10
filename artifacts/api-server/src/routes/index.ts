import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import housesRouter from "./houses";
import assignmentsRouter from "./assignments";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/houses", housesRouter);
router.use("/assignments", assignmentsRouter);

export default router;
