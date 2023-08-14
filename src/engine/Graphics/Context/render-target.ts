import { RenderSource } from './render-source';

export interface RenderTargetOptions {
  gl: WebGL2RenderingContext;
  width: number;
  height: number;
  antialias?: boolean;
  samples?: number;
}

export class RenderTarget {
  width: number;
  height: number;
  antialias: boolean = false;
  samples: number = 0;
  private _gl: WebGL2RenderingContext;
  constructor(options: RenderTargetOptions) {
    this._gl = options.gl;
    this.width = options.width;
    this.height = options.height;
    this.antialias = options.antialias ?? this.antialias;
    this.samples = options.samples ?? this._gl.getParameter(this._gl.MAX_SAMPLES);
    this._setupRenderBuffer();
    this._setupFramebuffer();
  }

  setResolution(width: number, height: number) {
    const gl = this._gl;
    this.width = width;
    this.height = height;

    // update backing texture size
    gl.bindTexture(gl.TEXTURE_2D, this._frameTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // update render buffer size
    if (this._renderBuffer) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderBuffer);
      gl.renderbufferStorageMultisample(
        gl.RENDERBUFFER,
        Math.min(this.samples, gl.getParameter(gl.MAX_SAMPLES)),
        gl.RGBA8,
        this.width,
        this.height);
    }
  }

  private _renderBuffer: WebGLRenderbuffer;
  public get renderBuffer() {
    return this._renderBuffer;
  }
  private _renderFrameBuffer: WebGLFramebuffer;
  public get renderFrameBuffer() {
    return this._renderFrameBuffer;
  }

  private _frameBuffer: WebGLFramebuffer;
  public get frameBuffer() {
    return this._frameBuffer;
  }
  private _frameTexture: WebGLTexture;
  public get frameTexture() {
    return this._frameTexture;
  }

  private _setupRenderBuffer() {
    if (this.antialias) {
      const gl = this._gl;
      
      // Render buffers can be used as an input to a shader
      this._renderBuffer = gl.createRenderbuffer();
      this._renderFrameBuffer = gl.createFramebuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderBuffer);
      gl.renderbufferStorageMultisample(
        gl.RENDERBUFFER,
        Math.min(this.samples, gl.getParameter(gl.MAX_SAMPLES)),
        gl.RGBA8,
        this.width,
        this.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._renderFrameBuffer);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this._renderBuffer);
    }
  }

  private _setupFramebuffer() {
    // Allocates frame buffer
    const gl = this._gl;
    this._frameTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this._frameTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    // attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;

    // After this bind all draw calls will draw to this framebuffer texture
    this._frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this._frameTexture, 0);
    
    // TODO bind render buffer
    // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachmentPoint, gl.RENDERBUFFER, this.renderBuffer);
    
    // TODO to render set the draw to null and blit
    // gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this._frameBuffer);
    // gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    // gl.blitFramebuffer(
    //   0, 0, this.width, this.height,
    //   0, 0, this.width, this.height,
    //   gl.COLOR_BUFFER_BIT, gl.LINEAR);


    // Reset after initialized
    this.disable();
  }

  public toRenderSource() {
    const source = new RenderSource(this._gl, this._frameTexture);
    return source;
  }

  /**
   * When called, all drawing gets redirected to this render target
   */
  public use() {
    const gl = this._gl;
    if (this.antialias) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._renderFrameBuffer);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer);
    }

    // very important to set the viewport to the size of the framebuffer texture
    gl.viewport(0, 0, this.width, this.height);
  }

  /**
   * When called, all drawing is sent back to the canvas
   */
  public disable() {
    const gl = this._gl;
    // passing null switches rendering back to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}