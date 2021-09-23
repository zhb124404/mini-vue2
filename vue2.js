class Vue {
  constructor(options) {
    // 初始化参数
    this.$el = document.querySelector(options.el)
    this.$data = options.data()
    this.$methods = options.methods

    // 初始化Watcher列表
    this.binding = {}
    // 启动Observer
    this.observe()

    // 映射根属性
    this.link(this.$data)
    this.link(this.$methods)

    // 解析模板 添加Watcher
    this.compile(this.$el)
  }

  // 观察者
  observe () {
    for (const key in this.$data) {
      /**
       * 此处利用闭包保存了两个变量
       * value：用于setter新值保存和getter新值获取
       * binding：一个指向当前vue实例的binding[key]的指针
       */
      let value = this.$data[key]
      const binding = this.binding[key] = []
      const _this = this
      Object.defineProperty(this.$data, key, {
        get () {
          return value // 获取闭包内的value
        },
        set (newValue) {
          if (newValue !== value) {
            /**
             * 此处如果直接去修改$data的key值会使setter被递归触发，导致内存溢出
             * getter和setter内this不再指向vm，可以通过闭包保存_this
             * _this.$data[key] = newValue
             */
            value = newValue // 更新闭包内的value
            // 数据更新时通知订阅者更新视图
            binding.forEach(watcher => watcher.update())
          }
        }
      })
    }
  }

  link (target) {
    for (const key in target) {
      let value = target[key] // value闭包
      Object.defineProperty(this, key, {
        get () {
          return target[key]
        },
        set (newValue) {
          if (newValue !== value) {
            value = newValue
            target[key] = newValue // 进一步更新$data和$methods对应属性
          }
        }
      })
    }
  }

  compile (el) {
    for (const node of el.children) {
      if (node.children.length > 0) {
        this.compile(node)
      }
      if (node.hasAttribute('v-model')) {
        const key = node.getAttribute('v-model')
        node.addEventListener('input', (() => {
          this.binding[key].push(new Watcher(node, 'value', this, key))
          return () => {
            // 更新数据
            this.$data[key] = node.value
          }
        })())
      }
      if (node.hasAttribute('@click')) {
        const key = node.getAttribute('@click')
        node.addEventListener('click', this.$methods[key].bind(this))
      }
      if (node.hasAttribute('v-text')) {
        const key = node.getAttribute('v-text')
        this.binding[key].push(new Watcher(node, 'innerText', this, key))
      }
      if (node.innerText) {
        const innerText = node.innerText
        const keys = innerText.match(/(?<={{).+?(?=}})/g)
        if (keys) {
          for (const key of keys) {
            // 需额外存放原始innerText
            this.binding[key].push(new Watcher(node, 'Mustache', this, key, innerText))
          }
        }
      }
    }
  }
}

// 订阅者
class Watcher {
  constructor(el, attr, vm, key, innerText) {
    this.el = el
    this.attr = attr
    this.vm = vm
    this.key = key
    this.innerText = innerText
    this.update()
  }

  // 更新视图
  update () {
    if (this.attr === 'Mustache') {
      this.el.innerText = this.innerText.replace(/{{(.+?)}}/g, (...args) => this.vm.$data[args[1]])
    } else {
      this.el[this.attr] = this.vm.$data[this.key]
    }
  }
}