# [2.0.0](https://github.com/garredow/foxcasts-core/compare/v1.5.0...v2.0.0) (2021-11-02)


### Features

* add duration to episode filter ([05fd45d](https://github.com/garredow/foxcasts-core/commit/05fd45d951e6fb67aafe9608d3a028514b5cb08e))
* add filter list options ([557e19b](https://github.com/garredow/foxcasts-core/commit/557e19b45604aac3cb23da4410b40ff732e2ca3b))
* add filter lists ([ff58262](https://github.com/garredow/foxcasts-core/commit/ff58262c82edd5caf76863630ace826d0e131718))
* add getepisodes function ([6f7a77e](https://github.com/garredow/foxcasts-core/commit/6f7a77eb79bf17a842096316022587e4b17c680f))
* add getPodcastsByIds function ([fb80ce1](https://github.com/garredow/foxcasts-core/commit/fb80ce156ce9c19cfef640510b5217b3d37f3389))
* convert bool to 1 and 0 ([c43f69f](https://github.com/garredow/foxcasts-core/commit/c43f69fda0eacbb2140e87b326b92da223d2ce65))
* refactor ([b4da4c7](https://github.com/garredow/foxcasts-core/commit/b4da4c7472c4ab337cf7ac595890d5a6c6c350c8))


### BREAKING CHANGES

* change to db indexes

# [1.5.0](https://github.com/garredow/foxcasts-core/compare/v1.4.0...v1.5.0) (2021-10-27)


### Features

* add artwork and accent color to models ([0d57e12](https://github.com/garredow/foxcasts-core/commit/0d57e1260fd05f29361363c4c273d26c21b07be0))
* add episode pagination ([bacf945](https://github.com/garredow/foxcasts-core/commit/bacf94592a512bd53d0ee505c0c4d3a7deab4852))
* **getartwork:** greatly improve performance ([e55fd4e](https://github.com/garredow/foxcasts-core/commit/e55fd4edbedefc421ec467d7a078bb223b2e19d6))

# [1.4.0](https://github.com/garredow/foxcasts-core/compare/v1.3.0...v1.4.0) (2021-10-24)


### Features

* **artwork:** require options ([f55027d](https://github.com/garredow/foxcasts-core/commit/f55027dc69eb6a284dbe0643cc5638bfb343a3dd))
* **episode:** rename fileUrl ([f3941cf](https://github.com/garredow/foxcasts-core/commit/f3941cffffcfa0f14148ab01bc5ba1423100a9a5))
* **episodeextended:** replace cover with artwork ([4bcd5e2](https://github.com/garredow/foxcasts-core/commit/4bcd5e21bd978550a13bd7f6e747459aa1ea2878))
* **index:** allow string ids ([2e44acc](https://github.com/garredow/foxcasts-core/commit/2e44acc433a6ea17e3a0131469c69550ca530fad))
* **podcast:** change return type of subscribe ([03ddb7e](https://github.com/garredow/foxcasts-core/commit/03ddb7e509df042b39c2e5e1286f61713cb0206e))
* **podcast:** remove artwork property ([e8dd56f](https://github.com/garredow/foxcasts-core/commit/e8dd56fd94a6d29d308d086f1e128d0616573d81))
* **podcast:** return id when subscribing ([49597cb](https://github.com/garredow/foxcasts-core/commit/49597cbe2588210245b43b30826a4ecbd17d8fe7))
* add artwork methods ([0fa93c6](https://github.com/garredow/foxcasts-core/commit/0fa93c611c3958ded9164ebdd0092f2a68146a7e))

# [1.3.0](https://github.com/garredow/foxcasts-core/compare/v1.2.0...v1.3.0) (2021-10-13)


### Features

* add method to update podcast ([9582134](https://github.com/garredow/foxcasts-core/commit/95821345caa82bc8eaf16a996df956735dfc120e))
* add new properties to podcast and episode ([5d9d3a7](https://github.com/garredow/foxcasts-core/commit/5d9d3a712e007ce79b03c0e0323eebf458f6bf83))

# [1.2.0](https://github.com/garredow/foxcasts-core/compare/v1.1.0...v1.2.0) (2021-09-25)


### Features

* **trending:** add support for since option ([7f3dc0c](https://github.com/garredow/foxcasts-core/commit/7f3dc0cdf24cb1be1880cb9b0f24c8a8fcc98a39))
* return update results ([962b075](https://github.com/garredow/foxcasts-core/commit/962b075f999c3ff55e248d5e2de8c833a711a718))

# [1.1.0](https://github.com/garredow/foxcasts-core/compare/v1.0.0...v1.1.0) (2021-09-23)


### Features

* add updateEpisode, fetchTrendingPodcasts, fetchCategories, and fetchPIStats ([ffc2979](https://github.com/garredow/foxcasts-core/commit/ffc2979783baf1504c1730d67731e2679bcfd627))

# 1.0.0 (2021-09-16)


### Features

* **apiservice:** cleanup ([73a027d](https://github.com/garredow/foxcasts-core/commit/73a027d0928d486509109162883c5bb13e35306a))
* **databaseservice:** include podcast title and cover with episodes ([bb10d46](https://github.com/garredow/foxcasts-core/commit/bb10d46e1e9150b48ddb4070cbaee93f85de1917))
* **episodeservice:** include cover art and podcast title with episode ([8fe5eb5](https://github.com/garredow/foxcasts-core/commit/8fe5eb5651bf256481ae7bd15611ec66eeaa4da3))
* **episodeservice:** use EpisodeFilterId type ([0839b45](https://github.com/garredow/foxcasts-core/commit/0839b45d9fc6cb8cfd68e808dff0f399f7b37766))
