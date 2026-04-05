import versionData from '../../../version.json'

type AppVersionPayload = {
  product: string
  brand: string
  version: string
  channel: string
  build: string
  codename: string
  status: string
  releaseDate: string
  notes: string
}

const appVersion = versionData as AppVersionPayload

export const APP_VERSION = appVersion
export const APP_VERSION_LABEL = `v${appVersion.version}`
export const APP_BUILD_LABEL = appVersion.build
export const APP_RELEASE_CHANNEL = appVersion.channel
