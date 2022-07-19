const { Restaurant, Category } = require('../models')
const { getOffset, getPagination } = require('../helpers/pagination-helper')

const restaurantServices = {
  getRestaurants: (req, callback) => {
    const DEFAULT_LIMIT = 9
    const categoryId = +req.query.categoryId || ''
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || DEFAULT_LIMIT
    const offset = getOffset(limit, page)

    return Promise.all([
      Restaurant.findAndCountAll({
        include: [Category],
        where: {
          ...categoryId ? { categoryId } : {}
        },
        limit,
        offset,
        raw: true,
        nest: true
      }),
      Category.findAll({ raw: true })
    ])
      .then(([restaurants, categories]) => {
        // 把撈到的 restaurants 資料經過以下3步驟處理並存成 data，才把 data 交給 hbs
        // 步驟1. 把每一間餐廳的描述受限只有50字
        // 步驟2&3. 增加叫做 isFavorited 和 isLike 的屬性，其 value 是布林值，看這間餐廳是不是有被使用者收藏或喜歡（有=1，沒有=0）

        const favoritedRestaurantsId = req.user?.FavoritedRestaurants ? req.user.FavoritedRestaurants.map(fr => fr.id) : []
        // 先確認req.user是否存在，不存在的話回傳undefined，最後會得到空陣列[]
        // 若存在的話去檢查FavoritedRestaurants是否存在。如果FavoritedRestaurants存在則執行map，不存在則回傳[]
        // req.user?.FavoritedRestaurants 等價 req.user && req.user.FavoritedRestaurants
        const likeRestaurantsId = req.user?.LikeRestaurants ? req.user.LikeRestaurants.map(lr => lr.id) : []
        const data = restaurants.rows.map(r => ({
          ...r,
          description: r.description.substring(0, 50),
          isFavorited: favoritedRestaurantsId.includes(r.id),
          isLike: likeRestaurantsId.includes(r.id)
        }))

        return callback(null, {
          restaurants: data,
          categories,
          categoryId,
          pagination: getPagination(limit, page, restaurants.count)
        })
      })
      .catch(err => callback(err))
  }
}

module.exports = restaurantServices
