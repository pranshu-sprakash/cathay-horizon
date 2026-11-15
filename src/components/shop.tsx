"use client"

import { useState } from "react"
import { Check, ChevronRight, Plane, ShoppingBag, Store, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RETURN_TRIP, SHOP_ITEMS, type ShopItem } from "@/lib/data"
import { useProfile } from "@/lib/store"
import { AppHeaderDark, Card, MILES, Scroll } from "./phone-ui"
import { Disclaimer, Sim } from "./shared"

type Pay = "miles" | "mixed" | "card"
type Delivery = "seat" | "collect" | "home"

const milesFor = (hkd: number) => Math.round((hkd * 11) / 50) * 50

function priceLine(item: ShopItem, pay: Pay) {
  const m = milesFor(item.hkd)
  if (pay === "miles") return `${MILES} ${m.toLocaleString()}`
  if (pay === "mixed") return `${MILES} ${(m / 2).toLocaleString()} + HK$ ${Math.round(item.hkd / 2)}`
  return `HK$ ${item.hkd}`
}

export function ShopScreen() {
  const { profile, set } = useProfile()
  const [itemId, setItemId] = useState<string | null>(null)
  const [pay, setPay] = useState<Pay>("miles")
  const [delivery, setDelivery] = useState<Delivery>("seat")
  const [done, setDone] = useState(false)
  const item = SHOP_ITEMS.find((i) => i.id === itemId)
  const back = () => (done ? (setDone(false), setItemId(null)) : item ? setItemId(null) : set({ phone: "recap" }))

  return (
    <Scroll>
      <div className="bg-jade-deep px-5 pb-5 text-white">
        <AppHeaderDark onBack={back} />
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-white/80">
          <ShoppingBag className="size-4" strokeWidth={1.8} /> Cathay Shop
        </p>
        <h2 className="mt-0.5 text-[24px] leading-8">{done ? "Order placed" : item ? item.name : "From your flight"}</h2>
        {!item && !done && (
          <p className="mt-1 text-[13px] leading-[18px] text-white/80">
            Picked from {profile.trip.flight}, {profile.trip.fromCity} to {profile.trip.toCity}. Pay with Asia Miles, cash or both.
          </p>
        )}
      </div>

      {!item && <ShopList onPick={setItemId} />}
      {item && !done && <ShopItemView item={item} pay={pay} setPay={setPay} delivery={delivery} setDelivery={setDelivery} onBuy={() => setDone(true)} />}
      {item && done && <ShopDone item={item} pay={pay} delivery={delivery} onDone={() => set({ phone: "home" })} />}
    </Scroll>
  )
}

function ShopList({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="px-4">
      <div className="mt-4 flex flex-col gap-3">
        {SHOP_ITEMS.map((i) => (
          <button key={i.id} data-demo={`shop-${i.id}`} onClick={() => onPick(i.id)} className="flex w-full items-center gap-3 rounded-[14px] bg-white p-2.5 pr-3 text-left shadow-[0_6px_20px_-14px_rgba(0,50,50,0.35)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.img} alt="" className="h-[78px] w-[104px] shrink-0 rounded-[10px] object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] leading-4 text-jade">{i.why}</p>
              <p className="mt-0.5 text-[15px] font-semibold leading-5 text-ink">{i.name}</p>
              <p className="mt-1 text-[12px] text-[#5d6766]">
                HK$ {i.hkd} or {MILES} {milesFor(i.hkd).toLocaleString()}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-[#7c8786]" />
          </button>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-2 px-1 text-[11px] text-[#5d6766]">
        Picked from what was served and used on board <Sim>Prices illustrative</Sim>
      </p>
      <Disclaimer className="py-6 text-center" />
    </div>
  )
}

function Option({ on, onClick, title, detail, icon: Icon, demo, tag }: { on: boolean; onClick: () => void; title: string; detail?: string; icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>; demo?: string; tag?: string }) {
  return (
    <button data-demo={demo} onClick={onClick} className="flex w-full items-center gap-3 border-b border-[#eef0ef] py-3 text-left last:border-0">
      {Icon && <Icon className={cn("size-[18px] shrink-0", on ? "text-jade" : "text-[#7c8786]")} strokeWidth={1.8} />}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[14px] text-ink">
          {title}
          {tag && <span className="rounded-full bg-[#e3efed] px-2 py-px text-[10px] font-semibold text-jade">{tag}</span>}
        </p>
        {detail && <p className="text-[12px] leading-4 text-[#5d6766]">{detail}</p>}
      </div>
      <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", on ? "border-jade bg-jade text-white" : "border-[#c4cbc9]")}>{on && <Check className="size-3" strokeWidth={3} />}</span>
    </button>
  )
}

function ShopItemView({ item, pay, setPay, delivery, setDelivery, onBuy }: { item: ShopItem; pay: Pay; setPay: (p: Pay) => void; delivery: Delivery; setDelivery: (d: Delivery) => void; onBuy: () => void }) {
  const { profile } = useProfile()
  const m = milesFor(item.hkd)
  return (
    <div className="px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.img} alt="" className="mt-4 aspect-[16/9] w-full rounded-[14px] object-cover" />
      <p className="mt-3 px-1 text-[13px] text-jade">{item.why}</p>
      <p className="mt-0.5 px-1 text-[13px] leading-[18px] text-[#5d6766]">{item.detail}</p>

      <p className="mb-1.5 mt-5 px-1 text-[15px] text-ink">Pay with</p>
      <Card>
        <Option demo="pay-miles" on={pay === "miles"} onClick={() => setPay("miles")} title={`${MILES} ${m.toLocaleString()}`} detail={`You have ${MILES} ${profile.asiaMiles.toLocaleString()}`} />
        <Option demo="pay-mixed" on={pay === "mixed"} onClick={() => setPay("mixed")} title={priceLine(item, "mixed")} detail="Miles plus cash" />
        <Option demo="pay-card" on={pay === "card"} onClick={() => setPay("card")} title={`HK$ ${item.hkd}`} detail="Card on file" />
      </Card>

      <p className="mb-1.5 mt-5 px-1 text-[15px] text-ink">Get it</p>
      <Card>
        <Option demo="get-seat" icon={Plane} on={delivery === "seat"} onClick={() => setDelivery("seat")} title={`At seat ${RETURN_TRIP.seat} on ${RETURN_TRIP.flight}`} detail={`${RETURN_TRIP.date}, ${RETURN_TRIP.fromCity} to ${RETURN_TRIP.toCity}`} tag="Next flight" />
        <Option demo="get-collect" icon={Store} on={delivery === "collect"} onClick={() => setDelivery("collect")} title="Click and Collect" detail="Cathay Shop, Hong Kong airport airside" />
        <Option demo="get-home" icon={Truck} on={delivery === "home"} onClick={() => setDelivery("home")} title="Delivered home" detail="Hong Kong, two to three days" />
      </Card>

      <Button data-demo="shop-buy" className="mb-6 mt-5 h-11 w-full rounded-full bg-jade text-[15px] font-semibold hover:bg-jade-deep" onClick={onBuy}>
        Buy for {priceLine(item, pay)}
      </Button>
    </div>
  )
}

function ShopDone({ item, pay, delivery, onDone }: { item: ShopItem; pay: Pay; delivery: Delivery; onDone: () => void }) {
  const { profile } = useProfile()
  const spent = pay === "miles" ? milesFor(item.hkd) : pay === "mixed" ? milesFor(item.hkd) / 2 : 0
  const where =
    delivery === "seat"
      ? { title: `Waiting at seat ${RETURN_TRIP.seat}`, line: `Loaded on ${RETURN_TRIP.flight}, ${RETURN_TRIP.date}. Crew hand it over after take-off, so there is nothing to carry through Delhi.` }
      : delivery === "collect"
        ? { title: "Ready to collect", line: "At Cathay Shop airside in Hong Kong. Show the order code in the app." }
        : { title: "On its way home", line: "Delivered in Hong Kong in two to three days." }
  return (
    <div className="px-4">
      <Card className="mt-4 py-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.img} alt="" className="h-[60px] w-[80px] shrink-0 rounded-[8px] object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">{item.name}</p>
            <p className="text-[12px] text-[#5d6766]">{priceLine(item, pay)}</p>
          </div>
        </div>
      </Card>
      <div className="mt-3 rounded-[14px] bg-[#d9e8e5] px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-jade text-white">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <p className="text-[16px] font-semibold text-jade-deep">{where.title}</p>
        </div>
        <p className="mt-2 text-[13px] leading-[18px] text-ink/85">{where.line}</p>
      </div>
      {spent > 0 && (
        <p className="mt-3 px-1 text-[13px] text-[#5d6766]">
          Asia Miles left: <span className="font-semibold text-ink">{MILES} {(profile.asiaMiles - spent).toLocaleString()}</span>
        </p>
      )}
      <Button variant="outline" className="mb-6 mt-5 h-10 w-full rounded-full bg-white text-[14px]" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}
