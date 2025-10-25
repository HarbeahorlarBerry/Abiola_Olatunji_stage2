import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Country = sequelize.define("Country", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    capital: { type: DataTypes.STRING },
    region: { type: DataTypes.STRING },
    population: { type: DataTypes.BIGINT, allowNull: false },
    currency_code: { type: DataTypes.STRING(10) }, // nullable if none
    exchange_rate: { type: DataTypes.DOUBLE },     // nullable if not found
    estimated_gdp: { type: DataTypes.DOUBLE },     // computed or null
    flag_url: { type: DataTypes.TEXT },
    last_refreshed_at: { type: DataTypes.DATE }
  }, {
    tableName: "countries",
    underscored: true,
    timestamps: true,
  });

  return Country;
};
