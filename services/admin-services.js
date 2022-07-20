const { Restaurant, Category } = require('../models')

const { imgurFileHandler } = require('../helpers/file-helpers')

const adminServices = {
  getRestaurants: (req, callback) => {
    return Restaurant.findAll({
      raw: true,
      nest: true,
      include: [Category]
    })
      .then(restaurants => callback(null, { restaurants }))
      .catch(err => callback(err))
  },
  deleteRestaurant: (req, callback) => {
    Restaurant.findByPk(req.params.id)
      .then(restaurant => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        return restaurant.destroy()
      })
      .then(deletedRestaurant => callback(null, { restaurant: deletedRestaurant }))
      .catch(err => callback(err))
  },
  postRestaurant: (req, callback) => {
    const { name, tel, address, openingHours, description, categoryId } = req.body
    if (!name) throw new Error('Restaurant name is required!')
    const { file } = req
    imgurFileHandler(file)
      .then(filePath => Restaurant.create({
        name,
        tel,
        address,
        openingHours,
        description,
        image: filePath || null,
        categoryId
      }))
      .then(newRestaurant => callback(null, { restaurant: newRestaurant }))
      .catch(err => callback(err))
  }
}

module.exports = adminServices
