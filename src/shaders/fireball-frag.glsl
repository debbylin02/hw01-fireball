#version 300 es

// This is a fragment shader. If you've opened this file first, please
// open and read lambert.vert.glsl before reading on.
// Unlike the vertex shader, the fragment shader actually does compute
// the shading of geometry. For every pixel in your program's output
// screen, the fragment shader is run for every bit of geometry that
// particular pixel overlaps. By implicitly interpolating the position
// data passed into the fragment shader by the vertex shader, the fragment shader
// can compute what color to apply to its pixel based on things like vertex
// position, light position, and vertex color.
precision highp float;

uniform vec4 u_Color; // The top color with which to render this instance of geometry.
uniform vec4 u_BottomColor; // The bottom color with which to render this instance of geometry.

// added for animation
// uniform int u_Time;
// NOTE: had to switch to an in value for time due to rendering issues
in float time; 

// These are the interpolated values out of the rasterizer, so you can't know
// their specific values without knowing the vertices that contributed to them
in vec4 fs_Nor;
in vec4 fs_Col;
in vec4 fs_Pos; 

in vec4 fs_LightVec;

// flame size 
uniform float u_FlameSize; 

// added for displacement 
in vec4 fs_displacement;
in float fs_total_displacement;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

// discontinuous pseudorandom uniformly distributed in [-0.5, +0.5]^3 
vec3 random3(vec3 c) {
	float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
	vec3 r;
	r.z = fract(512.0*j);
	j *= .125;
	r.x = fract(512.0*j);
	j *= .125;
	r.y = fract(512.0*j);
	return r-0.5;
}

// pow function for vec3 
vec3 pow3(vec3 v, float f) {
    float v1 = pow(v[0], f);
    float v2 = pow(v[1], f);
    float v3 = pow(v[2], f); 
    vec3 toReturn = vec3(v1, v2, v3); 
    return toReturn; 
}

// surflets for noise 
// surflets = dot prod relative to vectors anchored at regular points within a domain
float surflet(vec3 p, vec3 gridPoint) {
    // Compute the distance between p and the grid point along each axis, and warp it with a
    // quintic function so we can smooth our cells
    vec3 t2 = abs(p - gridPoint);
    vec3 t = vec3(1.f) - 6.f * pow3(t2, 5.f) + 15.f * pow3(t2, 4.f) - 10.f * pow3(t2, 3.f);
    // Get the random vector for the grid point (assume we wrote a function random2
    // that returns a vec2 in the range [0, 1])
    vec3 gradient = random3(gridPoint) * 2. - vec3(1., 1., 1.);
    // Get the vector from the grid point to P
    vec3 diff = p - gridPoint;
    // Get the value of our height field by dotting grid->P with our gradient
    float height = dot(diff, gradient);
    // Scale our height field (i.e. reduce it) by our polynomial falloff function
    return height * t.x * t.y * t.z;
}

// 3D perlin noise  
float perlinNoise3D(vec3 p) {
	float surfletSum = 0.f;
    // multiply by large number to make more fuzzy/static looking 
    // p = p * 5.f;
    p = p * 4.f;
	// Iterate over the four integer corners surrounding uv
	for(int dx = 0; dx <= 1; ++dx) {
		for(int dy = 0; dy <= 1; ++dy) {
			for(int dz = 0; dz <= 1; ++dz) {
                // sum up surflets
				surfletSum += surflet(p, floor(p) + vec3(dx, dy, dz));
			}
		}
	}
	return surfletSum;
}

// Noise function
float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

float noise(vec3 p){
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}

// FBM
float fbm(vec3 p, float freq, float amp) {
  float total = 0.f;
  float persistance = 0.5f;
  int NUM_OCTAVES = 5; 
	
  for (int i = 0; i < NUM_OCTAVES; i++) {
    total += amp * persistance * noise(p * freq);
    freq *= 2.f;
    amp *= persistance;
		persistance *= 0.5f;
	}
	return total;
}

// linear oscillation btwn 2 values - triangle  
float triangle_wave(float x, float freq, float amplitude) 
{
    // return abs((x * freq) mod amplitude - (0.5 * amplitude));
    return amplitude * abs(mod(x * freq, amplitude) - (0.5f * amplitude)); 
}

// Jagged oscillation — value increases linearly then resets - sawtooth 
float sawtooth_wave(float x, float freq, float amplitude)
{
    return (x * freq - floor(x * freq)) * amplitude; 
    
}

// bias 
float bias (float b, float t) {
  return pow(t, log(b) / log(0.5f)); 
}

// gain 
float gain(float g, float t) {
    if (t < 0.5f) {
        return bias(1.f - g, 2.f * t) / 2.f;
    } else {
        return 1.f - bias(1.f - g, 2.f - 2.f * t) / 2.f;
    }
}

void main()
{

    // Material base color (before shading)
    vec4 diffuseColor = u_Color;

    // Colors to blend - top and bottom 
    vec4 topCol = u_Color; 
    vec4 botCol = u_BottomColor; 

    // divide by flame size 
    // fs_displacement *= (u_FlameSize); 

    float clampedDisplacement = clamp(fs_displacement.y, 0.f, 1.f); 



    // use mix and smoothstep 
    // mix - lineraly interpolates btwn two values 
    vec4 col = mix(botCol, topCol, clampedDisplacement);

    // adding noise 
    float colorNoise = fbm(vec3(fs_displacement.xy, cos(0.02f * time)), 3.f, 3.f);
    col.xyz += col.xyz * 0.5f * colorNoise; 
    
    // Output to screen
    out_Col = vec4(col.xyz, 1.0); 

    // out_Col = vec4(diffuseColor.rgb, diffuseColor.a);  
     
}

