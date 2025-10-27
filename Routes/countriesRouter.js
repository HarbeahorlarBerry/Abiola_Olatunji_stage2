import express from "express";
import {
  refreshCountries,
  getCountries,          // ✅ use correct name
  getCountryByName,
  deleteCountryByName,
  serveSummaryImage,     // ✅ existing function to serve image
} from "../Controllers/CountriesApis/countriesController.js";

const router = express.Router();

/**
 * @route POST /countries/refresh
 * @desc Refresh all countries data from external APIs
 */
router.post("/refresh", refreshCountries);

/**
 * @route GET /countries
 * @desc Get all countries with optional filters & sorting
 */
router.get("/", getCountries);  // ✅ now correctly matches the controller

/**
 * @route GET /countries/image
 * @desc Serve the generated summary image
 */
router.get("/image", serveSummaryImage); // ✅ simplified, uses existing function

/**
 * @route GET /countries/:name
 * @desc Get a single country by name
 */
router.get("/:name", getCountryByName);

/**
 * @route DELETE /countries/:name
 * @desc Delete a country by name
 */
router.delete("/:name", deleteCountryByName);


export default router;
