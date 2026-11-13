import sys,glob
from PIL import Image, ImageDraw
s=sys.argv[1]; ims=[(p,Image.open(p)) for p in sorted(glob.glob(f"{s}/media/cands/L*/sheet.jpg"))]
W=1400; H=sum(int(i.height*W/i.width)+30 for _,i in ims); big=Image.new("RGB",(W,max(H,10)),(12,12,12)); d=ImageDraw.Draw(big); y=0
for p,i in ims:
    i=i.resize((W,int(i.height*W/i.width))); d.text((6,y+6),p.split('/')[3],fill=(255,90,90)); big.paste(i,(0,y+30)); y+=i.height+30
big.save(f"{s}/sheets.jpg",quality=78); print(s,big.size)
