const restaurantServices = require('../../services/restaurant-services')

const restaurantController = {
  getRestaurants: (req, res, next) => {
    restaurantServices.getRestaurants(req, (err, data) => err ? next(err) : res.json(data)) // 是否有err？若有就next(err)，若沒有就res.json(data)
  }
}

module.exports = restaurantController
