import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import inventoryRouter from "./inventory";
import salesRouter from "./sales";
import expensesRouter from "./expenses";
import reportsRouter from "./reports";
import customersRouter from "./customers";
import serialNumbersRouter from "./serial-numbers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(inventoryRouter);
router.use(salesRouter);
router.use(expensesRouter);
router.use(reportsRouter);
router.use(customersRouter);
router.use(serialNumbersRouter);

export default router;
