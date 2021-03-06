# Instantiates all objects used for cross frame discovery and communication.
module.exports = class CrossFrame
  this.$inject = [
    '$rootScope', '$document', '$window', 'store', 'annotationUI'
    'Discovery', 'bridge',
    'AnnotationSync', 'AnnotationUISync'
  ]
  constructor: (
    $rootScope, $document, $window, store, annotationUI
    Discovery, bridge,
    AnnotationSync, AnnotationUISync
  ) ->
    @frames = []

    createDiscovery = ->
      options =
        server: true
      new Discovery($window, options)

    createAnnotationSync = ->
      whitelist = ['$orphan', '$highlight', 'target', 'document', 'uri']
      options =
        formatter: (annotation) ->
          formatted = {}
          for k, v of annotation when k in whitelist
            formatted[k] = v
          formatted
        parser: (annotation) ->
          parsed = {}
          for k, v of annotation when k in whitelist
            parsed[k] = v
          parsed
        merge: (local, remote) ->
          annotationUI.updateAnchorStatus(local.id, local.$$tag, remote.$orphan)
          local
        emit: (args...) ->
          $rootScope.$apply ->
            $rootScope.$broadcast.call($rootScope, args...)
        on: (event, handler) ->
          $rootScope.$on(event, (event, args...) -> handler.apply(this, args))

      new AnnotationSync(bridge, options)

    createAnnotationUISync = (annotationSync) ->
      new AnnotationUISync($rootScope, $window, annotationUI, bridge)

    addFrame = (channel) =>
      channel.call 'getDocumentInfo', (err, info) =>
        if err
          channel.destroy()
        else
          searchUris = [info.uri]

          documentFingerprint = null
          if info.metadata and info.metadata.documentFingerprint
            documentFingerprint = info.metadata.documentFingerprint
            searchUris = info.metadata.link.map((link) -> link.href)

          $rootScope.$apply =>
            @frames.push({
              channel: channel,
              uri: info.uri,
              searchUris: searchUris,
              documentFingerprint: documentFingerprint
            })

    this.connect = ->
      discovery = createDiscovery()

      bridge.onConnect(addFrame)
      annotationSync = createAnnotationSync()
      annotationUISync = createAnnotationUISync(annotationSync)

      onDiscoveryCallback = (source, origin, token) ->
        bridge.createChannel(source, origin, token)
      discovery.startDiscovery(onDiscoveryCallback)

      this.call = bridge.call.bind(bridge)

    this.call = -> throw new Error('connect() must be called before call()')
