import sys
from PIL import Image, ImageDraw, ImageFont
from px import *
from figs import FIGS
def img(fig,scale,levels,box=None):
    g=render(fig,scale,levels); pal=palette(fig); b=box or bbox([g]); rows=to_rows(g,b)
    h=len(rows); w=len(rows[0]); im=Image.new('RGBA',(w+2,h+2),(0,0,0,0)); p=im.load()
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch!='.': p[x+1,y+1]=hx(pal[ch])+(255,)
    o=im.copy(); q=o.load()
    for y in range(h+2):
        for x in range(w+2):
            if p[x,y][3]==0 and any(0<=x+a<w+2 and 0<=y+b_<h+2 and p[x+a,y+b_][3] for a,b_ in((1,0),(-1,0),(0,1),(0,-1))): q[x,y]=(15,13,22,255)
    return o
names=sys.argv[2:] or list(FIGS)
CW=560; RH=300; cols=2; rowsn=(len(names)+cols-1)//cols
sheet=Image.new('RGB',(CW*cols,RH*rowsn),(38,34,50)); d=ImageDraw.Draw(sheet)
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
for i,n in enumerate(names):
    x0=(i%cols)*CW; y0=(i//cols)*RH; by=y0+RH-14
    d.text((x0+8,y0+6),n,font=f,fill=(200,196,215))
    x=x0+10
    for sc,lv,k,fr in ((0.34,3,3,0),(0.667,3,3,0),(0.667,3,3,1),(1.0,4,3,0)):
        im=img(FIGS[n](fr),sc,lv)
        big=im.resize((im.size[0]*k,im.size[1]*k),Image.NEAREST)
        sheet.paste(big,(x,by-big.size[1]),big); x+=big.size[0]+10
sheet.save(sys.argv[1])
