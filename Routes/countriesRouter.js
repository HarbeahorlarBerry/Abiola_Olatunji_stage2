import express from "express";
import {
  refreshCountries,
  getCountries,
  getCountryByName,
  deleteCountryByName,
  getStatus,
  serveSummaryImage
} from "../Controllers/CountriesApis/countriesController.js";

const router = express.Router();

router.post("/refresh", refreshCountries);
router.get("/", getCountries);
router.get("/image", serveSummaryImage);
router.get("/status", getStatus);
router.get("/:name", getCountryByName);
router.delete("/:name", deleteCountryByName);

export default router; // ✅ THIS IS REQUIRED

