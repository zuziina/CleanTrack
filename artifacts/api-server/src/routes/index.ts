import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import housesRouter from "./houses";
import assignmentsRouter from "./assignments";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/profile", profileRouter);
router.use("/houses", housesRouter);
router.use("/assignments", assignmentsRouter);

export default router;
