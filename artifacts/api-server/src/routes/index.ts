import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import companiesRouter from "./companies";
import housesRouter from "./houses";
import assignmentsRouter from "./assignments";
import workSessionsRouter from "./work-sessions";
import storageRouter from "./storage";
import issuePhotosRouter from "./issue-photos";
import checkoutPhotosRouter from "./checkout-photos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use("/users", usersRouter);
router.use("/companies", companiesRouter);
router.use("/houses", housesRouter);
router.use("/assignments", assignmentsRouter);
router.use("/assignments/:id/issue-photos", issuePhotosRouter);
router.use("/assignments/:id/checkout-photos", checkoutPhotosRouter);
router.use("/work-sessions", workSessionsRouter);

export default router;
