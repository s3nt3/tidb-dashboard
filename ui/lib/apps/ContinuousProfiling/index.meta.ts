import { AimOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'conprof',
  routerPrefix: '/continuous_profiling',
  icon: AimOutlined,
  translations,
  reactRoot: () =>
    import(/* webpackChunkName: "app_continuous_profiling" */ '.'),
}
