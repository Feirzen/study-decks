"""Tiny pixel-art renderer for Study Decks battle sprites.
Figures are built from polygons/ellipses/lines in design units (a humanoid is
about 48 x 64), shaded per part from a light at the upper left, then rasterised
at three sizes: mini (map), a (regular) and hi (bosses). No outline is baked in:
the game paints it. Each material owns five palette letters (dark to light)."""
import math

RAMPS = {
 'steel':  ['#1c1f2e','#3a4058','#687189','#9ea7b8','#e4e9f0'],
 'iron':   ['#131420','#262a3c','#454b62','#6d748a','#a9afc0'],
 'blue':   ['#161a40','#27357a','#3d58ad','#6a8bd8','#aac6f3'],
 'red':    ['#430d1c','#84192b','#bf3838','#e6704e','#f7b57c'],
 'crimson':['#2e0712','#5e0f1f','#96202b','#c9443c','#ee8a66'],
 'leather':['#23130d','#44271a','#6e4428','#9c683b','#cc9860'],
 'gold':   ['#4f3208','#946511','#d39a22','#f2ca4d','#fdf1ac'],
 'robe':   ['#0f0919','#221338','#3a205c','#5b3889','#8862b6'],
 'violet': ['#260d36','#481b63','#77339f','#a65dce','#d8a8f1'],
 'bone':   ['#43373a','#796860','#b0a091','#dcd1bf','#f8f2e4'],
 'wood':   ['#20110b','#3c2214','#5d3921','#825639','#a87b57'],
 'void':   ['#06040a','#0a0710','#0e0a16','#140e1e','#1c1428'],
 'glow':   ['#0d5878','#1a99bf','#4dd5ee','#a9f3fb','#ffffff'],
 'green':  ['#12240f','#24481c','#3f7a2b','#6aab3f','#a6d86a'],
 'moss':   ['#141f10','#2a3d1c','#48632b','#6f8c42','#a3bb6c'],
 'ooze':   ['#0c2a22','#16543f','#2b8a63','#5cc48d','#b4f0c8'],
 'ember':  ['#5a1206','#a52a0a','#e8641a','#f9a83a','#fff0a8'],
 'skin':   ['#4a2a22','#85513f','#c08562','#e2b08a','#f7dcbc'],
 'gskin':  ['#172610','#2f4a1d','#55782c','#84a745','#bdd47c'],
 'stone':  ['#1d1f26','#3a3e4a','#636876','#9196a2','#c9ccd4'],
 'white':  ['#3c4254','#7a8298','#b4bccb','#dfe4ec','#ffffff'],
 'black':  ['#0a0a12','#1c1c2a','#34344a','#57576f','#8d8da6'],
 'purple': ['#1c0f3a','#372068','#5b3aa6','#8a68d8','#c0aaf2'],
 'orange': ['#3d1406','#7c2d0c','#c2531a','#ec8a3a','#fbc98a'],
 'eyeyel': ['#7a5a05','#c79a0c','#f5d020','#fdee7a','#ffffff'],
 'eyered': ['#5a0808','#a31212','#ee2b2b','#ff5a3c','#ffd0b8'],
 'teal':   ['#082a2c','#115257','#1f8a8a','#52bfb8','#aeeee2'],
 'pink':   ['#3d0f2c','#7a1f55','#c0407f','#e77fae','#f9c4dc'],
 'cream':  ['#4a3a24','#8a7148','#c4ab7c','#e6d5ae','#fbf3dc'],
 'hair':   ['#1a0f0a','#33201a','#54362a','#7a543f','#a3795c'],
 'grey':   ['#2a2c33','#4d5058','#7c8089','#aeb2ba','#e2e5ea'],
}
BRIGHT = {'glow','ember','eyeyel','eyered'}
ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

def hx(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def tohex(c): return '#%02x%02x%02x'%tuple(c)
def mix(a,b,t): return tuple(int(round(a[i]*(1-t)+b[i]*t)) for i in range(3))
def desat(c,t):
    g=int(0.3*c[0]+0.59*c[1]+0.11*c[2]); return mix(c,(g,g,g),t)

class Fig:
    def __init__(s,w=48,h=64,k=1.0):
        s.w=w; s.h=h; s.parts=[]; s.mats=[]; s.ox=0; s.oy=0; s.k=k
    def mat(s,name,ramp,old='',bright=None):
        s.mats.append(dict(name=name,ramp=ramp,old=old,bright=(ramp in BRIGHT) if bright is None else bright)); return s
    def off(s,dx=0,dy=0): s.ox=dx; s.oy=dy; return s
    def _mi(s,m):
        for i,x in enumerate(s.mats):
            if x['name']==m: return i
        raise KeyError(m)
    def poly(s,pts,mat,form='round',**k):
        s.parts.append(dict(kind='poly',pts=[((x+s.ox)*s.k,(y+s.oy)*s.k) for x,y in pts],mi=s._mi(mat),form=form,**k)); return s
    def ell(s,cx,cy,rx,ry,mat,form='round',**k):
        s.parts.append(dict(kind='ell',c=((cx+s.ox)*s.k,(cy+s.oy)*s.k,rx*s.k,ry*s.k),mi=s._mi(mat),form=form,**k)); return s
    def line(s,x0,y0,x1,y1,w,mat,form='round',**k):
        s.parts.append(dict(kind='line',l=((x0+s.ox)*s.k,(y0+s.oy)*s.k,(x1+s.ox)*s.k,(y1+s.oy)*s.k,w*s.k),mi=s._mi(mat),form=form,**k)); return s
    def path(s,pts,w,mat,form='round',**k):
        for a,b in zip(pts,pts[1:]): s.line(a[0],a[1],b[0],b[1],w,mat,form,**k)
        return s

def inside(p,x,y,minw):
    if p['kind']=='poly':
        pts=p['pts']; c=False; n=len(pts)
        for i in range(n):
            x0,y0=pts[i]; x1,y1=pts[(i+1)%n]
            if (y0>y)!=(y1>y) and x < (x1-x0)*(y-y0)/(y1-y0)+x0: c=not c
        return c
    if p['kind']=='ell':
        cx,cy,rx,ry=p['c']; rx=max(rx,minw*0.5); ry=max(ry,minw*0.5)
        return ((x-cx)/rx)**2+((y-cy)/ry)**2<=1
    x0,y0,x1,y1,w=p['l']; w=max(w,minw)
    dx,dy=x1-x0,y1-y0; L=dx*dx+dy*dy
    t=max(0,min(1,((x-x0)*dx+(y-y0)*dy)/L)) if L else 0
    return math.hypot(x-(x0+t*dx),y-(y0+t*dy))<=w/2

TONES = {3:([1,2,3],[1,3,4]), 4:([0,1,2,3],[1,2,3,4])}

def render(fig,scale,levels):
    """-> grid[y][x] of None or (material index, tone 0..4); untrimmed."""
    pw,ph=int(math.ceil(fig.w*scale)),int(math.ceil(fig.h*scale))
    part=[[-1]*pw for _ in range(ph)]; lvl=[[0.0]*pw for _ in range(ph)]
    minw=1.0/scale
    for zi,p in enumerate(fig.parts):
        mask=[]
        for py in range(ph):
            y=(py+0.5)/scale
            for px in range(pw):
                if inside(p,(px+0.5)/scale,y,minw): mask.append((px,py))
        if not mask: continue
        ys=[m[1] for m in mask]; y0,y1=min(ys),max(ys); rows={}
        for px,py in mask:
            a=rows.get(py); rows[py]=(min(a[0],px),max(a[1],px)) if a else (px,px)
        gx0=min(r[0] for r in rows.values()); gx1=max(r[1] for r in rows.values())
        for px,py in mask:
            a,b=rows[py]
            if p.get('wide'): a,b=gx0,gx1
            t=(px-a)/max(1,b-a) if b>a else 0.35
            v=(py-y0)/max(1,y1-y0); f=p['form']
            if f=='round': br=0.92-abs(t-0.3)*1.25-0.22*v
            elif f=='metal':
                br=0.9-abs(t-0.3)*1.3-0.2*v
                if 0.2<t<0.42 and v<0.45: br+=0.22
            elif f=='ball': br=1.05-1.5*math.hypot(t-0.32,v-0.28)
            elif f=='flat': br=0.62-0.3*t-0.18*v
            elif f=='cloth': br=0.66-0.42*t-0.12*v+0.13*math.sin((px/scale)*1.15+p.get('ph',0))
            elif f=='glow': br=1.0-0.9*math.hypot(t-0.5,v-0.5)*1.6
            elif f=='lit': br=0.95
            elif f=='dark': br=0.1
            elif f=='vgrad': br=0.85-0.6*v
            else: br=float(f)
            part[py][px]=zi; lvl[py][px]=br+p.get('b',0)
    base=[r[:] for r in lvl]
    for y in range(ph):
        for x in range(pw):
            z=part[y][x]
            if z<0: continue
            for dx,dy in ((-1,0),(0,-1)):
                xx,yy=x+dx,y+dy
                if 0<=xx<pw and 0<=yy<ph and part[yy][xx]>z and not fig.parts[part[yy][xx]].get('noshadow'):
                    lvl[y][x]=base[y][x]-0.2; break
    out=[[None]*pw for _ in range(ph)]
    for y in range(ph):
        for x in range(pw):
            z=part[y][x]
            if z<0: continue
            p=fig.parts[z]; m=fig.mats[p['mi']]
            tones=TONES[levels][1 if m['bright'] else 0]
            i=max(0,min(len(tones)-1,int(lvl[y][x]*len(tones))))
            out[y][x]=(p['mi'],tones[i])
    return out

def bbox(grids):
    x0=y0=10**9; x1=y1=-1
    for g in grids:
        for y,r in enumerate(g):
            for x,c in enumerate(r):
                if c: x0=min(x0,x); x1=max(x1,x); y0=min(y0,y); y1=max(y1,y)
    return x0,y0,x1,y1

def to_rows(g,box):
    x0,y0,x1,y1=box
    return [''.join(ALPHA[c[0]*5+c[1]] if c else '.' for c in r[x0:x1+1]) for r in g[y0:y1+1]]

def palette(fig,sat=0.28):
    pal={}
    for i,m in enumerate(fig.mats):
        r=RAMPS[m['ramp']] if isinstance(m['ramp'],str) else m['ramp']
        for t in range(5):
            c=hx(r[t])
            if not m['bright']: c=desat(c,sat)
            pal[ALPHA[i*5+t]]=tohex(c)
    return pal
