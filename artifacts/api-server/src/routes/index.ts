import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import companiesRouter from "./companies";
import housesRouter from "./houses";
import assignmentsRouter from "./assignments";
import workSessionsRouter from "./work-sessions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/companies", companiesRouter);
router.use("/houses", housesRouter);
router.use("/assignments", assignmentsRouter);
router.use("/work-sessions", workSessionsRouter);

export default router;
