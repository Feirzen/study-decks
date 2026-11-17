"""Figure definitions. Each returns a Fig for idle frame fr (0 or 1).
Authored facing right. mat(name, ramp, old) : `old` lists the palette letters of
the pre-2026 sprite that this material stands in for, so old recolors still work."""
from px import Fig
FIGS = {}
def fig(fn): FIGS[fn.__name__] = fn; return fn
def mir(pts, cx): return [(2*cx-x, y) for x, y in reversed(pts)]

# ------------------------------------------------------------ armored body
def armored(f, fr, helm='armet', plume=True, cape=True, weapon='sword', shield=False, spikes=False):
    b = 1.5*fr
    if cape:
        sw = -1.5*fr
        f.poly([(15,18),(30,18),(27,36),(21,52),(12+sw,59),(3+sw,55),(7,36)],'cape','cloth',wide=True,b=-0.05)
    f.poly([(16,40),(23,40),(22.5,57),(16,57)],'armor','metal')
    f.poly([(24,40),(31,40),(32,57),(25.5,57)],'armor','metal')
    f.ell(19.5,47,3.6,2.6,'armor','metal',b=0.08); f.ell(28.5,47,3.8,2.6,'armor','metal',b=0.08)
    f.poly([(14,56),(23,56),(24,61),(13,61)],'armor','flat',b=-0.05); f.poly([(24.5,56),(33,56),(36,61),(24.5,61)],'armor','flat',b=0.05)
    f.off(0,b)
    f.poly([(9,21),(14,20),(14.5,33),(10,34)],'armor','metal',b=-0.1)
    f.poly([(8.5,33),(14,33),(14,43),(9,43)],'armor','metal',b=-0.16)
    f.poly([(14.5,18),(32.5,18),(31,35),(16,35)],'armor','metal',wide=True)
    f.line(15.5,24,31.5,24,0.9,'armor','dark',noshadow=True); f.line(16,28.5,31,28.5,0.9,'armor','dark',noshadow=True)
    f.poly([(15,35),(32,35),(34,47),(29,49),(24,46),(19,49),(13,47)],'cape','cloth',wide=True,ph=1.5)
    f.path([(13.5,47),(19,49),(24,46),(29,49),(34,47)],1.1,'gold','lit',noshadow=True)
    f.poly([(15,33),(32,33),(32,36.5),(15,36.5)],'leather','flat',wide=True)
    f.poly([(22,32.6),(26,32.6),(26,37),(22,37)],'gold','metal')
    f.poly([(18,14.5),(29,14.5),(31,19),(16,19)],'armor','flat',b=-0.12)
    if helm == 'armet':
        f.poly([(17.5,4),(27,3.5),(30.5,7.5),(31,14.5),(28,17.5),(19.5,17.5),(16.5,14),(16,8)],'armor','metal',wide=True)
        f.line(22,10,31,10,1.3,'visor','dark',noshadow=True)
        f.line(27,12.2,27,15.5,0.8,'visor','dark',noshadow=True); f.line(29.3,12.2,29.3,15,0.8,'visor','dark',noshadow=True)
    elif helm == 'bucket':
        f.poly([(17,4.5),(30,4.5),(31,17.5),(18,17.5)],'armor','metal',wide=True)
        f.poly([(17,3.2),(30,3.2),(30.5,5.4),(16.6,5.4)],'armor','flat',b=0.2)
        f.line(21,10,31,10,1.9,'visor','dark',noshadow=True)
        f.ell(24.6,10,0.9,0.9,'eye',0.45,noshadow=True); f.ell(28.6,10,0.9,0.9,'eye',0.45,noshadow=True)
        f.line(26.6,11.5,26.6,17,0.8,'visor','dark',noshadow=True)
    else:  # horned
        f.poly([(18,6),(21,-1),(15,-5),(12,-1),(15,0),(16,5)],'gold','metal',b=-0.1)
        f.poly([(29,6),(27,-1),(33,-5),(36,-1),(33,0),(31.5,5)],'gold','metal')
        f.poly([(17,4),(27,3),(31,7),(31.5,14.5),(28,18),(19.5,18),(16.5,14),(16,8)],'armor','metal',wide=True)
        f.poly([(21,8.5),(31.5,8.5),(31.5,12.5),(26,11),(21,12.5)],'visor','dark',noshadow=True)
        f.ell(24.4,10.2,0.9,0.9,'eye',0.45,noshadow=True); f.ell(28.8,10.2,0.9,0.9,'eye',0.45,noshadow=True)
        f.line(23.6,3.5,23.6,8,1.4,'gold','lit',noshadow=True)
    if plume:
        f.poly([(21,4.5),(18,1),(12,0.5),(8-fr,4),(10-fr,8),(13,5),(17,6.5)],'plume','cloth',wide=True)
    if shield:
        f.poly([(3,24),(15,24),(15,38),(9,45),(3,38)],'cape','round',wide=True,b=0.12)
        f.path([(3,24),(15,24),(15,38),(9,45),(3,38),(3,24)],1.2,'gold','lit',noshadow=True)
        f.ell(9,32,1.8,1.8,'gold','metal')
    f.ell(11.5,20.5,5,4.2,'armor','metal',b=0.05)
    f.ell(34,20.5,5.6,4.6,'armor','metal',b=0.1)
    if spikes:
        f.poly([(9,18),(8,11),(13,17)],'armor','metal',b=0.15); f.poly([(33,17),(36,10),(38,17.5)],'armor','metal',b=0.2)
    if weapon == 'sword':
        f.poly([(36.2,40.6),(40.2,39),(46.6,56.5),(46.2,60.5),(43.2,58)],'blade','metal',b=0.22)
        f.line(38.6,41,45.4,58.2,0.8,'blade','dark',noshadow=True)
        f.line(33.6,42.2,42.6,38.4,1.9,'gold','metal')
    elif weapon == 'up':
        f.poly([(36,30),(39.6,29.6),(43.5,6),(42,2),(39.5,5)],'blade','metal',b=0.22)
        f.line(38,29,41.6,5.5,0.8,'blade','dark',noshadow=True)
        f.line(33.5,30.5,42.5,29.4,1.9,'gold','metal')
    else:  # greatsword, point down in front
        f.poly([(38.5,22),(43.5,22),(44,58),(41,63),(38,58)],'blade','metal',b=0.2)
        f.line(41,23,41,60,0.9,'blade','dark',noshadow=True)
        f.line(34.5,21.5,47.5,21.5,2.2,'gold','metal')
        f.line(41,12,41,21,1.7,'leather','round'); f.ell(41,11,1.8,1.8,'gold','lit')
    f.poly([(32.5,21),(38,23),(38.5,32.5),(33,33)],'armor','metal')
    if weapon == 'great':
        f.poly([(34,27),(43.5,24.5),(44.5,30),(35,33.5)],'armor','metal',b=-0.06)
    elif weapon == 'up':
        f.poly([(32.6,29),(39.6,28.6),(40.4,36),(34,37)],'armor','metal',b=-0.06)
    else:
        f.poly([(32.6,31.5),(39.6,31.5),(40.4,39.5),(34,41)],'armor','metal',b=-0.06)
        f.line(33,34.2,40,34.2,0.9,'armor','dark',noshadow=True)
        f.ell(35.4,30.6,1.5,1.5,'gold','lit')
    f.off(0,0)

@fig
def hero_knight(fr):
    f = Fig(50,66)
    f.mat('armor','steel').mat('cape','blue').mat('plume','red').mat('leather','leather').mat('gold','gold').mat('visor','void').mat('blade','white').mat('eye','glow')
    f.off(0,6); armored(f, fr); return f

@fig
def knight(fr):
    f = Fig(50,66)
    f.mat('armor','iron','aAd').mat('cape','purple','kK').mat('plume','crimson','pP').mat('leather','leather').mat('gold','gold','gG').mat('visor','void','v').mat('blade','white','sS').mat('eye','eyered','r')
    f.off(0,6); armored(f, fr, helm='bucket', plume=False, weapon='up', shield=True); return f

@fig
def commander(fr):
    f = Fig(56,76,k=1.12)
    f.mat('armor','black','aAd').mat('cape','crimson','kK').mat('plume','crimson','pP').mat('leather','leather').mat('gold','gold','gGr').mat('visor','void','v').mat('blade','white','sS').mat('eye','eyered','r')
    f.off(0,6); armored(f, fr, helm='horned', plume=False, weapon='great', spikes=True); return f

@fig
def hero_wizard(fr):
    f = Fig(50,66); b = 1.5*fr
    f.mat('robe','purple').mat('panel','violet').mat('gold','gold').mat('skin','skin').mat('beard','white').mat('wood','wood').mat('gem','glow').mat('boot','leather').mat('dark','void')
    f.off(0,2)
    f.line(40,10,41,62,1.8,'wood','round')
    f.poly([(15,58),(23,58),(23,62),(14,62)],'boot','flat'); f.poly([(25,58),(33,58),(36,62),(25,62)],'boot','flat',b=0.1)
    f.poly([(15,24+b),(31,24+b),(35,60),(11,60)],'robe','cloth',wide=True)
    f.poly([(21,26+b),(27,26+b),(28.5,60),(19.5,60)],'panel','cloth',wide=True,b=-0.05,ph=2)
    f.line(11,59.6,35,59.6,1.4,'gold','lit',noshadow=True)
    f.off(0,2+b)
    f.poly([(15.5,36),(31.5,36),(32,39.5),(15,39.5)],'gold','flat',wide=True)
    f.poly([(10,24),(15.5,23),(15,38),(9,41)],'robe','cloth',b=-0.1)
    f.poly([(9.5,40),(13.5,39),(14,43),(10,43.5)],'skin','round',b=-0.1)
    f.poly([(12,21),(34,21),(36,27.5),(23.5,29.5),(10,27.5)],'robe','round',wide=True,b=0.1)
    f.path([(10,27.5),(23.5,29.5),(36,27.5)],1.0,'gold','lit',noshadow=True)
    f.ell(25.5,15.5,4.8,5.2,'skin','round')
    f.ell(28,14.6,0.75,0.9,'dark','dark',noshadow=True)
    f.poly([(20.5,16.5),(24,17.5),(30.5,17),(29.5,24),(26,29.5),(22,25)],'beard','cloth',wide=True,b=0.15)
    f.ell(24.5,10.6,11,2.7,'robe','flat',b=-0.02)
    f.poly([(18,10),(31.5,10),(26.5,3),(19,-0.5),(14.5,1.5),(21,5)],'robe','round',wide=True,b=0.06)
    f.line(18.5,9.3,31,9.3,1.3,'gold','lit',noshadow=True)
    f.poly([(31,23),(37,25),(41.5,35),(35,38.5)],'robe','cloth')
    f.poly([(38,34),(42.5,34),(42.5,38.5),(38,38.5)],'skin','round')
    f.off(0,2)
    f.poly([(40,-1.5),(44.5,4.5),(40,11),(35.5,4.5)],'gem','glow')
    f.line(37,9.5,36,5,0.9,'gold','lit',noshadow=True); f.line(43,9.5,44,5,0.9,'gold','lit',noshadow=True)
    return f

@fig
def hero_ranger(fr):
    f = Fig(50,66); b = 1.5*fr
    f.mat('cloak','green').mat('tunic','moss').mat('leather','leather').mat('skin','skin').mat('wood','wood').mat('string','white').mat('gold','gold').mat('dark','void').mat('pants','hair')
    f.off(0,3+b)
    f.poly([(9,14),(13,12),(17,26),(13,28)],'leather','round')
    f.line(10,13,8,7,1,'string','lit',noshadow=True); f.line(12,12.5,11.5,6,1,'string','lit',noshadow=True); f.line(11,13,13.5,7.5,1,'gold','lit',noshadow=True)
    f.off(0,3)
    f.poly([(14,19+b),(31,19+b),(29,40),(22,54),(12-fr,57),(6-fr,41)],'cloak','cloth',wide=True,b=-0.1)
    f.poly([(16,40),(23,40),(22.5,54),(16.5,54)],'pants','round'); f.poly([(24,40),(31,40),(31.5,54),(25.5,54)],'pants','round',b=0.05)
    f.poly([(15,51),(23.5,51),(24,61),(13.5,61)],'leather','round',b=-0.05); f.poly([(24.5,51),(32.5,51),(35.5,61),(24.5,61)],'leather','round',b=0.05)
    f.line(15,52,23.5,52,1.2,'leather','lit',noshadow=True); f.line(24.5,52,32.5,52,1.2,'leather','lit',noshadow=True)
    f.off(0,3+b)
    f.poly([(15,19),(32,19),(32.5,43),(24,46),(14.5,43)],'tunic','cloth',wide=True)
    f.poly([(15,33),(32,33),(32,36),(15,36)],'leather','flat',wide=True,b=-0.15)
    f.poly([(22,32.6),(25.5,32.6),(25.5,36.4),(22,36.4)],'gold','metal')
    f.line(17,20,30.5,33,1.7,'leather','flat',b=-0.1)
    f.poly([(9.5,21),(14.5,20),(14.5,34),(10,35)],'tunic','round',b=-0.1)
    f.poly([(9,33),(14.2,33),(14.2,41.5),(9.5,41.5)],'leather','round',b=-0.05)
    f.poly([(11,18),(35,18),(36.5,25),(23.5,28.5),(9.5,25)],'cloak','round',wide=True,b=0.08)
    f.poly([(16,6),(24,2.5),(31,6),(33.5,15),(30.5,21),(18,21),(14.5,14)],'cloak','round',wide=True,b=0.06)
    f.ell(25.8,13.2,4.4,5.2,'dark','dark',noshadow=True)
    f.ell(26.8,14.2,3.2,3.9,'skin','round',b=-0.12,noshadow=True)
    f.ell(28.4,13.2,0.7,0.8,'dark','dark',noshadow=True)
    f.path([(40.5,10),(44,19),(45,30),(45,38),(44,48),(40.5,57)],1.7,'wood','round')
    f.line(40.5,10,40.5,57,0.6,'string','lit',noshadow=True)
    f.poly([(32,20),(37.5,22),(40,32),(34.5,33.5)],'tunic','round')
    f.poly([(34.5,31),(40.5,30.5),(46,36),(45,40.5),(37,39.5)],'leather','round')
    return f

# ------------------------------------------------------------ creatures
@fig
def slime(fr):
    f = Fig(50,34); q = 1.5*fr
    f.mat('body','ooze','ab').mat('eye','void','e').mat('shine','white','W')
    f.poly([(6-q,32),(3-q,27),(5-q,19+q),(10,12+q),(18,7.5+q),(26,6+q),(33,8.5+q),(40,14+q),(44+q,21+q),(46+q,28),(44+q,32)],'body','ball',wide=True)
    f.ell(11,31.5,3,1.6,'body',0.3); f.ell(24,32,3.4,1.5,'body',0.3); f.ell(38,31.6,3,1.6,'body',0.25)
    f.ell(27,25+q*.5,9,3.6,'body',0.2,noshadow=True)
    f.poly([(16.5,17+q),(22.5,19.5+q),(22,23+q),(17.5,22+q)],'eye','dark',noshadow=True); f.poly([(29.5,19.5+q),(35.5,17+q),(34.5,22+q),(30,23+q)],'eye','dark',noshadow=True)
    f.ell(14.5,13.5+q,3,1.7,'shine','lit',noshadow=True); f.ell(20.5,10.4+q,1.1,0.8,'shine','lit',noshadow=True)
    return f

@fig
def bat(fr):
    f = Fig(52,36); d = 9*fr
    f.mat('body','purple','a').mat('wing','robe','wW').mat('eye','eyeyel','e').mat('fang','white','f')
    L = [(22,17),(14,8+d*.3),(4,5+d),(1,13+d),(6,12.5+d),(8,18+d*.8),(12.5,16.5+d*.6),(14.5,22+d*.4),(18.5,19.5),(22,23)]
    f.poly(L,'wing','cloth',wide=True,b=-0.05); f.poly(mir(L,26),'wing','cloth',wide=True,b=0.02)
    for pts in ([(22,17),(14,8+d*.3),(4,5+d)],[(14,8+d*.3),(8,18+d*.8)],[(14,8+d*.3),(14.5,22+d*.4)]):
        f.path(pts,1.1,'body',0.75,noshadow=True); f.path(mir(pts,26),1.1,'body',0.75,noshadow=True)
    f.ell(26,22,5,7,'body','ball')
    f.poly([(22,12),(20.5,4),(25,9.5)],'body','round',b=-0.1); f.poly([(30,12),(31.5,4),(27,9.5)],'body','round')
    f.ell(26,13.5,4.8,4.4,'body','ball',b=0.05)
    f.ell(24.2,13.2,0.9,0.9,'eye','lit',noshadow=True); f.ell(27.8,13.2,0.9,0.9,'eye','lit',noshadow=True)
    f.line(24.8,16.4,24.8,18,0.7,'fang','lit',noshadow=True); f.line(27.2,16.4,27.2,18,0.7,'fang','lit',noshadow=True)
    f.line(24,28,23.4,31,0.9,'body',0.4); f.line(28,28,28.6,31,0.9,'body',0.4)
    return f

@fig
def ghost(fr):
    f = Fig(50,62); w = 1.5*fr
    f.mat('body','white','ab').mat('face','void','c').mat('eye','glow','e')
    f.poly([(11,26),(5,30),(2,37),(6,36),(8,39),(13,33)],'body','cloth',b=-0.12)
    f.poly([(16,8),(24,3),(32,8),(35,18),(38,30),(40,44),(37+w,52),(34,46),(31+w,57),(27,49),(24+w,59),(20,50),(16+w,56),(13,47),(9+w,51),(10,34),(13,18)],'body','cloth',wide=True)
    f.ell(25.5,15,5.2,6.2,'face','dark',noshadow=True)
    f.ell(23.6,14.6,1,1.1,'eye','lit',noshadow=True); f.ell(28,14.6,1,1.1,'eye','lit',noshadow=True)
    f.poly([(33,24),(42,26),(46,30),(47,35),(44,32.5),(43,36),(40,33),(33,31)],'body','cloth',b=0.08)
    return f

@fig
def skeleton(fr):
    f = Fig(50,66); b = 1.5*fr
    f.mat('bone','bone','w').mat('dark','void','k').mat('rag','crimson').mat('blade','grey').mat('wood','wood')
    f.off(0,3)
    f.path([(21,41),(20,51),(20.5,60)],2.2,'bone','round',b=-0.1); f.path([(27.5,41),(29,51),(28.5,60)],2.2,'bone','round')
    f.poly([(16.5,59),(22.5,59),(23,62),(15.5,62)],'bone','flat'); f.poly([(26,59),(31.5,59),(34,62),(26,62)],'bone','flat',b=0.1)
    f.ell(20.2,50.5,1.9,1.9,'bone','ball'); f.ell(29,50.5,1.9,1.9,'bone','ball')
    f.off(0,3+b)
    f.path([(17,20),(12.5,29),(13.5,39)],2,'bone','round',b=-0.15)
    f.line(24.5,17,24.5,37,2.4,'bone','round',b=-0.1)
    for i,y in enumerate((20.5,23.5,26.5,29.5)):
        f.path([(17.5+i*.4,y),(24.5,y-1.2),(31.5-i*.4,y)],1.3,'bone','round',wide=True)
    f.poly([(18,36),(31,36),(29,41.5),(20,41.5)],'bone','round',wide=True)
    f.poly([(18.5,39),(30.5,39),(32,47),(28,45),(25,49),(22,45),(18,47.5)],'rag','cloth',wide=True)
    f.line(16.5,19,32.5,19,2.2,'bone','round',wide=True,b=0.05)
    f.ell(24.8,10,5.8,5.6,'bone','ball')
    f.poly([(21.5,13.5),(30,13.5),(29.2,18),(22.5,18)],'bone','flat',b=0.1)
    f.ell(23.6,10.3,1.5,1.8,'dark','dark',noshadow=True); f.ell(28.3,10.3,1.5,1.8,'dark','dark',noshadow=True)
    f.line(26,12.6,26,13.8,0.8,'dark','dark',noshadow=True)
    f.line(22.8,16,29.2,16,0.7,'dark','dark',noshadow=True)
    f.poly([(37.5,36),(41,35),(45.5,13),(44,9),(41.5,13)],'blade','metal',b=0.1)
    f.line(35.5,37.6,43.5,34.6,1.7,'wood','flat')
    f.path([(32,20),(37,28),(39,36.5)],2,'bone','round')
    f.ell(39.2,37.2,1.9,1.9,'bone','ball')
    return f

@fig
def goblin(fr):
    f = Fig(52,54); b = 1.5*fr
    f.mat('skin','gskin','g').mat('cloth','leather','bB').mat('blade','grey','W').mat('eye','eyeyel','E').mat('dark','void','em').mat('tooth','cream','t').mat('wood','wood','l')
    f.off(2,2)
    f.poly([(17,38),(23,38),(23,48),(17,48)],'skin','round',b=-0.1); f.poly([(25,38),(31,38),(31.5,48),(25.5,48)],'skin','round')
    f.poly([(14.5,47),(23.5,47),(24,51),(13.5,51)],'skin','flat'); f.poly([(25,47),(32.5,47),(35.5,51),(25,51)],'skin','flat',b=0.1)
    f.off(2,2+b)
    f.poly([(10,23),(15,22),(14.5,36),(9.5,37)],'skin','round',b=-0.12)
    f.poly([(15,21),(32,21),(33.5,40),(29,43),(24,40),(19,43),(14.5,40)],'cloth','cloth',wide=True)
    f.line(15,34,33,34,1.6,'dark',0.5,noshadow=True)
    f.poly([(17,13),(6,7),(9,13),(15,18)],'skin','round',b=-0.1)
    f.poly([(33,13),(44,8),(41,14),(34,18)],'skin','round',b=0.05)
    f.ell(25,14,8.4,7.2,'skin','ball',wide=True)
    f.poly([(22.5,11.4),(26.5,12.6),(26.2,14.2),(22.8,13.6)],'eye','lit',noshadow=True); f.poly([(28.6,12.6),(32.6,11.4),(32.2,13.6),(28.8,14.2)],'eye','lit',noshadow=True)
    f.poly([(26.6,14),(29,14),(29.6,17),(26,17)],'skin',0.9,noshadow=True)
    f.line(22.5,18.4,31.5,18.4,1.2,'dark','dark',noshadow=True)
    f.line(24,17.8,24,19,0.8,'tooth','lit',noshadow=True); f.line(30,17.8,30,19,0.8,'tooth','lit',noshadow=True)
    f.poly([(38.5,17),(45.5,14.5),(47.5,27),(44,30.5),(40,29)],'blade','metal',b=0.05)
    f.line(39.5,29,38,37.5,1.8,'wood','round')
    f.poly([(32,22),(37.5,24),(40.5,34),(35,36)],'skin','round')
    f.ell(38.4,34.6,2.4,2.4,'skin','ball')
    return f

@fig
def imp(fr):
    f = Fig(50,48); d = 7*fr
    f.mat('skin','crimson','r').mat('wing','black','W').mat('horn','cream','h').mat('eye','eyeyel','y').mat('dark','void','m')
    L = [(21,20),(12,9+d*.4),(3,8+d),(6,15+d),(3,21+d),(9,20.5+d*.8),(12,27+d*.5),(19,25)]
    f.poly(L,'wing','cloth',wide=True,b=0.1); f.poly(mir(L,25),'wing','cloth',wide=True,b=0.18)
    f.path([(24,31),(33,39),(41,36)],1.4,'skin','round',b=-0.1); f.poly([(40,33),(46,34),(41.5,39.5)],'skin','round')
    f.path([(22,31),(20,39),(22.5,42.5)],1.9,'skin','round',b=-0.1); f.path([(28,31),(30,39),(28,42.5)],1.9,'skin','round')
    f.ell(25,25.5,5.8,7.8,'skin','ball')
    f.path([(20,22),(15,27),(16,31)],1.7,'skin','round',b=-0.1); f.path([(30,22),(35,26.5),(37,24)],1.7,'skin','round')
    f.poly([(20.5,10.5),(16,2),(23,7.5)],'horn','round'); f.poly([(29.5,10.5),(34,2),(27,7.5)],'horn','round',b=0.1)
    f.ell(25,13.5,6.4,5.8,'skin','ball',b=0.05)
    f.poly([(21,12),(24.4,13.4),(24,14.8),(21.2,14)],'eye','lit',noshadow=True); f.poly([(26.4,13.4),(29.8,12),(29.6,14),(26.8,14.8)],'eye','lit',noshadow=True)
    f.path([(22,16.8),(25,17.8),(28.6,16.8)],0.9,'dark','dark',noshadow=True)
    return f

@fig
def beetle(fr):
    f = Fig(56,38); b = fr
    f.mat('shell','purple','a').mat('legs','black','lbd').mat('eye','eyeyel','e').mat('shine','white','w')
    for x0,x1,x2 in ((14,9,8),(23,22,20),(32,35,38)):
        f.path([(x0,27),(x1+b,33),(x2+b,36.5)],1.7,'legs','round')
    f.poly([(41,21),(46,15),(48,7),(51,8.5),(50.5,17),(45,25)],'legs','round',b=0.15)
    f.ell(39,23.5,6.2,5.8,'shell','ball',b=-0.12)
    f.ell(22,20,15.5,10.5,'shell','ball',wide=True)
    f.line(8,19.5,36,21.5,0.8,'legs','dark',noshadow=True)
    f.ell(15,13.5,3.6,1.6,'shine','lit',noshadow=True)
    f.ell(41.6,22.4,1,1,'eye','lit',noshadow=True)
    return f

@fig
def spider(fr):
    f = Fig(58,46); b = 1.2*fr
    f.mat('body','iron','a').mat('legs','black','lbd').mat('eye','eyered','e').mat('fang','white','fw')
    f.line(20,0,20,9,0.7,'fang',0.6)
    for i,(kx,ky,fx,fy) in enumerate(((27,6,9,32),(24,3,2,24),(40,5,52,30),(44,9,56,38))):
        f.path([(32,24),(kx,ky+b*(1 if i%2 else -1)),(fx,fy)],1.6,'legs','round',b=-0.05)
    f.ell(20,20,11.5,10.5,'body','ball')
    f.poly([(18,13),(22,13),(21,17.5),(22.5,22),(17.5,22),(19,17.5)],'eye',0.45,noshadow=True)
    f.ell(35,24.5,6.6,5.6,'body','ball',b=-0.08)
    for i,(kx,ky,fx,fy) in enumerate(((31,10,16,40),(36,8,30,43),(42,12,46,43),(45,16,54,44))):
        f.path([(34,25),(kx,ky+b*(1 if i%2 else -1)),(fx,fy)],1.7,'legs','round',b=0.12)
    f.ell(37.6,22.6,0.9,0.9,'eye','lit',noshadow=True); f.ell(40,24,0.9,0.9,'eye','lit',noshadow=True); f.ell(37.2,25.2,0.7,0.7,'eye','lit',noshadow=True)
    f.line(39,28,39.6,31.5,0.9,'fang','lit'); f.line(36.6,28.6,36.4,32,0.9,'fang','lit')
    return f

@fig
def mushroom(fr):
    f = Fig(50,50); q = fr
    f.mat('cap','crimson','rR').mat('spots','cream','w').mat('stem','cream','sS').mat('dark','void','em').mat('feet','wood','f')
    f.poly([(14,43),(22,43),(22.5,48),(13,48)],'feet','flat'); f.poly([(27,43),(35,43),(36.5,48),(27,48)],'feet','flat',b=0.1)
    f.poly([(14,31),(8.5,35),(9.5,40),(14.5,37)],'stem','round',b=-0.2); f.poly([(35,31),(40.5,35),(39.5,40),(34.5,37)],'stem','round',b=-0.05)
    f.poly([(15,24),(34,24),(36,44.5),(13,44.5)],'stem','round',wide=True,b=-0.08)
    f.poly([(9,24.5+q),(40,24.5+q),(36,29+q),(13,29+q)],'dark',0.6)
    f.poly([(3,23+q),(7,12+q),(15,5.5+q),(25,3+q),(35,6+q),(42,13+q),(46,23+q),(39,26.5+q),(24,27.5+q),(10,26.5+q)],'cap','ball',wide=True)
    for x,y,rx,ry in ((14,13,3.2,2.4),(26,8,2.6,2),(35,15,3,2.4),(22,19,2.2,1.8),(8.5,20,1.8,1.5)):
        f.ell(x,y+q,rx,ry,'spots',0.7,noshadow=True)
    f.poly([(19,32),(23.5,33.6),(23,36.4),(19.4,35.6)],'dark','dark',noshadow=True); f.poly([(26.5,33.6),(31,32),(30.6,35.6),(27,36.4)],'dark','dark',noshadow=True)
    f.path([(20.5,40),(23,39),(25,40.4),(27,39),(29.5,40)],1,'dark','dark',noshadow=True)
    return f

@fig
def crab(fr):
    f = Fig(64,38); q = fr
    f.mat('shell','orange','cC').mat('eye','void','e').mat('shine','white')
    for pts in ([(19,27),(10,30+q),(7,36)],[(22,29),(15,33),(13.5,36.5)],[(42,29),(49,33),(50.5,36.5)],[(45,27),(54,30+q),(57,36)]):
        f.path(pts,1.9,'shell','round',b=-0.15)
    f.path([(17,22),(9,18)],3,'shell','round',b=-0.12)
    f.poly([(11,8),(3,10),(2,17),(7,15.5),(9,19.5),(13,16)],'shell','round',b=-0.05)
    f.line(25,14,24,7.5,1.3,'shell','round'); f.line(38,14,39,7.5,1.3,'shell','round')
    f.ell(24,6.5,1.9,1.9,'eye',0.55); f.ell(39,6.5,1.9,1.9,'eye',0.55)
    f.ell(24.5,6,0.7,0.7,'shine','lit',noshadow=True); f.ell(39.5,6,0.7,0.7,'shine','lit',noshadow=True)
    f.ell(32,22,16.5,9.8,'shell','ball',wide=True)
    f.poly([(20,13.5),(22,9.5),(24.5,13)],'shell','round',b=0.1); f.poly([(31,12),(32.5,8),(34.5,12)],'shell','round',b=0.1); f.poly([(40,13),(42.5,9.5),(44.5,14)],'shell','round')
    f.path([(22,26),(27,27.5),(32,26),(37,27.5),(42,26)],0.9,'eye',0.5,noshadow=True)
    f.path([(46,22),(54,18)],3.4,'shell','round')
    f.poly([(51,6-q),(60,8.5-q),(62,17-q),(56.5,14.5),(54,19),(49.5,15)],'shell','round',b=0.1)
    f.poly([(52,18.5),(60,19.5+q),(56,24+q),(50,21.5)],'shell','round',b=-0.02)
    return f

@fig
def eyeball(fr):
    f = Fig(50,54); w = 1.5*fr
    f.mat('ball','bone','w').mat('iris','green','i').mat('pupil','void','p').mat('flesh','crimson','vt').mat('vein','red','r')
    for pts in ([(17,31),(15+w,40),(17-w,49)],[(24,34),(25-w,43),(23+w,52)],[(31,31),(33+w,40),(31-w,47)]):
        f.path(pts,2,'flesh','round',b=-0.05)
    f.ell(24,20,14.5,14.5,'ball','ball')
    f.path([(10,20),(14,22),(16,26)],0.8,'vein',0.5,noshadow=True); f.path([(12,13),(16,15)],0.8,'vein',0.5,noshadow=True); f.path([(16,30),(19,28)],0.8,'vein',0.5,noshadow=True)
    f.ell(29.5,20.5,7,7.6,'iris','ball',noshadow=True)
    f.ell(31.5,20.5,2.8,4,'pupil','dark',noshadow=True)
    f.ell(28,16.6,1.3,1.3,'ball','lit',noshadow=True)
    f.poly([(8.5,17),(11.5,8.5),(21,4),(31,5),(38,10.5),(31,8.5),(20,9),(13,13.5)],'flesh','round',wide=True,b=0.1)
    return f

# ------------------------------------------------------------ bosses
@fig
def slimeking(fr):
    f = Fig(68,58); q = 1.5*fr
    f.mat('body','ooze','ab').mat('eye','void','em').mat('pupil','eyered','E').mat('crown','gold','gG').mat('gem','eyered','R').mat('tooth','cream','f').mat('shine','white','W')
    f.off(0,4)
    f.poly([(24,11+q),(22.5,1+q),(27.5,6+q),(31,-1+q),(34.5,5.5+q),(38,-1+q),(41.5,6+q),(46,1+q),(44.5,11+q)],'crown','metal',wide=True)
    f.ell(31,3.5+q,1.1,1.1,'gem',0.45,noshadow=True); f.ell(38,3.5+q,1.1,1.1,'gem',0.45,noshadow=True)
    f.poly([(5-q,52),(2-q,42),(5-q,27+q),(12,16+q),(23,9.5+q),(34,8+q),(45,11+q),(55,18+q),(61+q,29+q),(65+q,42),(63+q,52)],'body','ball',wide=True)
    for x in (11,24,37,50,59): f.ell(x,51.8,3.6,1.9,'body',0.28)
    f.ell(21,16+q,4.5,2.2,'shine','lit',noshadow=True); f.ell(29,12+q,1.5,1,'shine','lit',noshadow=True)
    f.poly([(18,23+q),(29,28+q),(28,34+q),(19.5,32+q)],'eye','dark',noshadow=True); f.poly([(39,28+q),(50,23+q),(48.5,32+q),(40,34+q)],'eye','dark',noshadow=True)
    f.ell(24.5,30+q,1.5,1.7,'pupil',0.45,noshadow=True); f.ell(43.5,30+q,1.5,1.7,'pupil',0.45,noshadow=True)
    f.poly([(20,39+q*.5),(48,39+q*.5),(45,48),(23,48)],'eye','dark',noshadow=True)
    for x in (23,28,33,38,43): f.poly([(x-1.6,39+q*.5),(x+1.6,39+q*.5),(x,43)],'tooth','lit',noshadow=True)
    for x in (26,31,36,41): f.poly([(x-1.4,48),(x+1.4,48),(x,45)],'tooth',0.7,noshadow=True)
    return f

@fig
def golem(fr):
    f = Fig(68,70); b = 1.5*fr
    f.mat('stone','stone','Aad').mat('eye','glow','e').mat('moss','moss','g').mat('core','ember','oO').mat('dark','void')
    f.off(2,3)
    f.poly([(19,46),(30,46),(30.5,62),(17,62)],'stone','round',b=-0.1); f.poly([(34,46),(45,46),(47.5,62),(34,62)],'stone','round')
    f.poly([(15,60),(31,60),(31.5,66),(14,66)],'stone','flat'); f.poly([(33.5,60),(48.5,60),(51,66),(33.5,66)],'stone','flat',b=0.1)
    f.off(2,3+b)
    f.poly([(21,40),(43,40),(42,49),(22,49)],'stone','flat',wide=True,b=-0.2)
    f.poly([(5,26),(15,26),(14.5,41),(4,41)],'stone','round',b=-0.12); f.poly([(3,39),(15,39),(16,55),(2,55)],'stone','round',b=-0.08)
    f.ell(9,56.5,7.4,6.4,'stone','ball',b=-0.05)
    f.poly([(16,15),(48,15),(46,42),(18,42)],'stone','round',wide=True)
    f.path([(22,22),(27,26),(25,32),(30,37)],0.9,'dark',0.4,noshadow=True); f.path([(42,19),(39,24),(41,29)],0.9,'dark',0.4,noshadow=True)
    f.ell(32,28,4.4,5,'core','glow',noshadow=True)
    f.path([(32,33),(31,37),(33,40)],1,'core',0.5,noshadow=True); f.path([(36,27),(39,26)],1,'core',0.5,noshadow=True)
    f.poly([(25,5),(39,5),(40.5,17),(23.5,17)],'stone','round',wide=True,b=0.05)
    f.line(29,11,39.5,11,2,'dark','dark',noshadow=True)
    f.ell(32,11,1.1,1,'eye','lit',noshadow=True); f.ell(37,11,1.1,1,'eye','lit',noshadow=True)
    f.ell(12.5,20,9.4,8.2,'stone','ball'); f.ell(51.5,20,9.4,8.2,'stone','ball',b=0.06)
    f.ell(10,13.6,5.4,2.2,'moss',0.6,noshadow=True); f.ell(50,13.4,4.6,2,'moss',0.7,noshadow=True); f.ell(27,5.4,3,1.3,'moss',0.6,noshadow=True)
    f.poly([(49,26),(59,26),(60,41),(49.5,41)],'stone','round'); f.poly([(49,39),(61,39),(62,55),(48,55)],'stone','round',b=0.04)
    f.ell(55,56.5,7.4,6.4,'stone','ball',b=0.05)
    return f

@fig
def lich(fr):
    f = Fig(58,72); w = 1.5*fr
    f.mat('robe','robe','Vv').mat('bone','bone','w').mat('crown','gold','y').mat('glow','ooze','oOg',bright=True).mat('dark','void','k').mat('wood','wood','l').mat('panel','violet')
    f.off(2,4)
    f.line(46,9,47,65,1.8,'wood','round')
    f.poly([(15,22),(13,8),(20.5,16)],'robe','round',b=-0.1); f.poly([(37,22),(40,8),(32.5,16)],'robe','round')
    f.poly([(16,22),(36,22),(43,60),(39+w,66),(35,61),(31+w,67),(27,61),(22+w,67),(18,61),(13+w,66),(10,60)],'robe','cloth',wide=True)
    f.poly([(23,24),(29,24),(31,61),(27,61),(24.5,64),(22,61)],'panel','cloth',wide=True,b=-0.18,ph=2)
    f.poly([(10,24),(16,24),(13.5,38),(8,41),(4,35)],'robe','cloth',b=-0.08)
    f.path([(6,35),(3.5,29),(4,26)],1.2,'bone','round'); f.path([(7.5,34),(7,28)],1.2,'bone','round')
    f.ell(5,21-w,3.2,3.2,'glow','glow')
    f.poly([(11,21),(41,21),(43,28),(26,31),(9,28)],'robe','round',wide=True,b=0.1)
    f.path([(9,28),(26,31),(43,28)],1.1,'crown','lit',noshadow=True)
    f.poly([(22.5,16),(30.5,16),(29.5,21.5),(24,21.5)],'bone','flat',b=0.05)
    f.ell(26.5,12.5,5.8,6.2,'bone','ball')
    f.ell(24.6,12.8,1.6,1.9,'dark','dark',noshadow=True); f.ell(29.2,12.8,1.6,1.9,'dark','dark',noshadow=True)
    f.ell(24.8,13,0.7,0.7,'glow','lit',noshadow=True); f.ell(29.4,13,0.7,0.7,'glow','lit',noshadow=True)
    f.line(27,15.6,27,16.8,0.8,'dark','dark',noshadow=True); f.line(24,19,29.6,19,0.7,'dark','dark',noshadow=True)
    f.poly([(20.5,8.5),(20,1.5),(23.2,5),(26.5,0),(29.8,5),(33,1.5),(32.5,8.5)],'crown','metal',wide=True)
    f.poly([(35,25),(42,27),(47,38),(40,41.5)],'robe','cloth')
    f.poly([(44,36.5),(48.6,36.5),(48.6,41),(44,41)],'bone','round')
    f.ell(46,5-w*.5,3.6,3.8,'glow','glow')
    f.line(42.6,9,43.6,5,0.9,'crown','lit',noshadow=True); f.line(49.4,9,48.6,5,0.9,'crown','lit',noshadow=True)
    return f

@fig
def dragon(fr):
    f = Fig(84,68); d = 3*fr
    f.mat('body','crimson','aAd').mat('wing','black','wW').mat('horn','cream','Hc').mat('belly','gold','gG').mat('eye','eyeyel','E').mat('dark','void','kmB').mat('tooth','white','F')
    f.off(2,3)
    L = [(32,28),(24,11+d*.5),(10,2+d),(3,8+d),(6,20+d),(1,31+d),(9,29+d*.8),(10,41+d*.6),(18,35+d*.4),(23,45),(32,40)]
    f.poly(L,'wing','cloth',wide=True,b=0.12); f.poly(mir(L,40),'wing','cloth',wide=True,b=0.2)
    for pts in ([(32,28),(24,11+d*.5),(10,2+d)],[(24,11+d*.5),(1,31+d)],[(24,11+d*.5),(10,41+d*.6)],[(24,11+d*.5),(23,45)]):
        f.path(pts,1.5,'body',0.5,noshadow=True); f.path(mir(pts,40),1.5,'body',0.6,noshadow=True)
    f.path([(46,54),(58,60),(69,57),(75,49)],4.2,'body','round',b=-0.1); f.poly([(72,50),(79,42),(79.5,52)],'body','round')
    f.ell(27,53,7.6,7.4,'body','ball',b=-0.08); f.ell(53,53,7.6,7.4,'body','ball')
    f.ell(40,42,12.5,14.5,'body','ball')
    f.ell(40,45,7.2,11,'belly','ball',noshadow=True)
    for y in (39,43,47,51): f.line(34,y,46,y,0.8,'belly',0.2,noshadow=True)
    for cx in (27,53):
        f.poly([(cx-7,58),(cx+7,58),(cx+8,62),(cx-8,62)],'body','flat')
        for k in (-5.5,0,5.5): f.poly([(cx+k-1.5,60.5),(cx+k+1.5,60.5),(cx+k,64)],'horn','lit',noshadow=True)
    f.poly([(34,32),(46,32),(45.5,20),(34.5,20)],'body','round',wide=True,b=-0.05)
    f.poly([(32.5,11),(24,-1),(28.5,1),(37,10)],'horn','round'); f.poly(mir([(32.5,11),(24,-1),(28.5,1),(37,10)],40),'horn','round',b=0.1)
    f.poly([(31,9),(49,9),(51.5,17),(47,26),(40,30),(33,26),(28.5,17)],'body','round',wide=True)
    f.poly([(35,19),(45,19),(44.5,28),(40,31.5),(35.5,28)],'body','round',wide=True,b=0.12)
    f.poly([(31.5,13.5),(37.5,16.5),(37,19),(32.5,17)],'eye','lit',noshadow=True); f.poly(mir([(31.5,13.5),(37.5,16.5),(37,19),(32.5,17)],40),'eye','lit',noshadow=True)
    f.line(35,15.4,35.6,18,0.8,'dark','dark',noshadow=True); f.line(45,15.4,44.4,18,0.8,'dark','dark',noshadow=True)
    f.line(30.5,12,38.5,15.6,1.1,'body',0.15,noshadow=True); f.line(49.5,12,41.5,15.6,1.1,'body',0.15,noshadow=True)
    f.ell(38,26.6,0.8,0.8,'dark','dark',noshadow=True); f.ell(42,26.6,0.8,0.8,'dark','dark',noshadow=True)
    f.poly([(35.6,28.6),(37.4,28.6),(36.5,31.5)],'tooth','lit',noshadow=True); f.poly([(42.6,28.6),(44.4,28.6),(43.5,31.5)],'tooth','lit',noshadow=True)
    return f

@fig
def scientist(fr):
    f = Fig(52,66); b = 1.5*fr
    f.mat('coat','white','cC').mat('skin','skin','sS').mat('hair','grey','Hh').mat('lens','glow','GL').mat('flask','pink','xX').mat('pants','black','pb').mat('tie','crimson','t').mat('glove','leather','gw').mat('dark','void','m')
    f.off(1,4)
    f.poly([(17,44),(23.5,44),(23,58),(17,58)],'pants','round'); f.poly([(25,44),(31.5,44),(32,58),(26,58)],'pants','round',b=0.05)
    f.poly([(15,57),(24,57),(24.5,61.5),(14,61.5)],'pants','flat',b=-0.1); f.poly([(25,57),(33,57),(36,61.5),(25,61.5)],'pants','flat')
    f.off(1,4+b)
    f.poly([(9.5,21),(15,20),(14.5,36),(9.5,37)],'coat','cloth',b=-0.12)
    f.poly([(9,36),(14.5,36),(14.5,42),(9.5,42)],'glove','round')
    f.poly([(14.5,19),(32.5,19),(35,51),(27,52.5),(24,49),(20,52.5),(12.5,51)],'coat','cloth',wide=True)
    f.poly([(21.5,19),(26.5,19),(25.5,33),(23.5,35),(22,33)],'tie','flat',noshadow=True)
    f.line(24,35,24.6,51,0.8,'dark',0.5,noshadow=True)
    f.poly([(12,18.5),(35,18.5),(36,24),(23.5,21.5),(11,24)],'coat','round',wide=True,b=0.1)
    f.ell(25,12,5.4,5.8,'skin','ball')
    f.poly([(17,11),(15,3),(19.5,6),(21,0.5),(24.5,5),(28,0),(29.5,5),(34,2.5),(32,10),(28,7.5),(22,8)],'hair','round',wide=True,b=0.1)
    f.line(20.5,11.5,30.6,11.5,1,'pants','dark',noshadow=True)
    f.ell(24,11.6,2,2,'lens','lit',noshadow=True); f.ell(29,11.6,2,2,'lens','lit',noshadow=True)
    f.path([(23,15.6),(25.5,16.6),(28.5,15.4)],0.8,'dark','dark',noshadow=True)
    f.poly([(32,20.5),(37.5,22.5),(41,31),(35.5,33.5)],'coat','cloth')
    f.poly([(36,30.5),(41.5,29.5),(43,35),(37.5,36.5)],'glove','round')
    f.poly([(40.5,17),(43.5,17),(43.5,23),(47.5,31),(36.5,31),(40.5,23)],'flask','round',wide=True,b=0.1)
    f.line(39.5,16.6,44.5,16.6,1.1,'coat','lit',noshadow=True)
    f.ell(42,13-2*fr,1.2,1.2,'flask','lit',noshadow=True); f.ell(44.4,9.5-2*fr,0.9,0.9,'flask','lit',noshadow=True)
    return f

@fig
def showman(fr):
    f = Fig(52,70); b = 1.5*fr
    f.mat('coat','crimson','cC').mat('hat','black','hH').mat('band','red','r').mat('skin','skin','sS').mat('trim','gold','vg').mat('shirt','white','w').mat('cane','wood','kK').mat('dark','void','emp').mat('pants','black','b')
    f.off(1,8)
    f.poly([(17,43),(23.5,43),(23,57),(17,57)],'pants','round'); f.poly([(25,43),(31.5,43),(32,57),(26,57)],'pants','round',b=0.05)
    f.poly([(15,56),(24,56),(24.5,61.5),(14,61.5)],'pants','flat',b=-0.08); f.poly([(25,56),(33,56),(36.5,61.5),(25,61.5)],'pants','flat',b=0.05)
    f.line(42,30,43.5,61.5,1.6,'cane','round'); 
    f.off(1,8+b)
    f.poly([(13,34),(19,34),(17,55),(10,52)],'coat','cloth',b=-0.15); f.poly([(29,34),(35,34),(38,52),(31,55)],'coat','cloth',b=-0.05)
    f.poly([(9.5,21),(15,20),(14.5,36),(9.5,37)],'coat','cloth',b=-0.12)
    f.poly([(9,36),(14.5,36),(14.5,41.5),(9.5,41.5)],'shirt','round')
    f.poly([(14.5,19),(32.5,19),(33.5,45),(24,47),(13.5,45)],'coat','cloth',wide=True)
    f.poly([(21,19),(27,19),(26,40),(22,40)],'shirt','flat',noshadow=True,b=0.15)
    for y in (24,29,34,39): f.ell(18.5,y,1,1,'trim','lit',noshadow=True); 
    for y in (24,29,34,39): f.ell(29.5,y,1,1,'trim','lit',noshadow=True)
    f.poly([(22,18.6),(26,18.6),(27.5,21.5),(24,20.6),(20.5,21.5)],'band',0.6,noshadow=True)
    f.ell(11.5,20.5,4.6,2.8,'trim','metal'); f.ell(34.5,20.5,4.8,2.8,'trim','metal')
    f.ell(25,12.5,5.2,5.6,'skin','ball')
    f.ell(23.4,11.6,0.8,0.9,'dark','dark',noshadow=True); f.ell(27.8,11.6,0.8,0.9,'dark','dark',noshadow=True)
    f.path([(19.5,14),(22.5,15.6),(25.6,14.6),(28.6,15.6),(31.6,14)],1.3,'dark',0.3,noshadow=True)
    f.ell(25,7.6,9.6,2.2,'hat','flat',b=0.1)
    f.poly([(18.5,7.5),(31.5,7.5),(32.5,-6),(17.5,-6)],'hat','round',wide=True)
    f.poly([(18.4,4),(31.6,4),(31.8,7),(18.2,7)],'band','flat',wide=True,noshadow=True)
    f.poly([(32,20.5),(37.5,22.5),(42,30),(37,33)],'coat','cloth')
    f.ell(41.5,31,2.6,2.6,'shirt','ball')
    f.ell(42,28.4-b,2,2,'trim','metal')
    return f

@fig
def hooded(fr):
    f = Fig(54,72); w = 1.5*fr
    f.mat('robe','blue','hH').mat('inner','white','rR').mat('trim','gold','yYa').mat('eye','glow','eA').mat('dark','void','b').mat('staff','wood','s')
    f.off(2,4)
    f.line(43,9,44,66,1.8,'staff','round')
    f.poly([(15,22),(35,22),(41,60),(37+w,66),(33,62),(29+w,67),(25,62),(21+w,67),(17,62),(12+w,66),(9,60)],'robe','cloth',wide=True)
    f.poly([(21,24),(29,24),(31.5,62),(29+w,67),(25,62),(21+w,67),(19,62)],'inner','cloth',wide=True,b=-0.1,ph=2)
    f.line(25,30,25,40,1,'trim','lit',noshadow=True); f.line(22,33,28,33,1,'trim','lit',noshadow=True)
    f.poly([(9.5,24),(15.5,24),(14,39),(10.5,44),(6,38)],'robe','cloth',b=-0.1)
    f.poly([(10,20.5),(40,20.5),(42,27.5),(25,31),(8,27.5)],'robe','round',wide=True,b=0.1)
    f.path([(8,27.5),(25,31),(42,27.5)],1.2,'trim','lit',noshadow=True)
    f.poly([(15.5,7),(25,1.5),(34,6),(37,16),(34,22.5),(17,22.5),(13.5,15)],'robe','round',wide=True,b=0.08)
    f.path([(19.5,19.5),(18.5,12),(22,7),(27.5,5.5),(32,8.5),(33.5,14),(32.5,19.5)],1.1,'trim','lit',noshadow=True)
    f.ell(26,13.5,5,6,'dark','dark',noshadow=True)
    f.ell(24,13.4,1,1,'eye','lit',noshadow=True); f.ell(28.6,13.4,1,1,'eye','lit',noshadow=True)
    f.poly([(33,24),(39.5,26),(44.5,37),(38,40)],'robe','cloth')
    f.ell(43.4,38,2.4,2.4,'inner','ball')
    f.ell(43,5-w*.5,4.4,4.4,'trim','flat',b=0.1); f.ell(43,5-w*.5,2.6,2.6,'eye','glow',noshadow=True)
    return f
