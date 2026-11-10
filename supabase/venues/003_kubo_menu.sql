-- Kubo: move the happy hour price list out of the fine print into a structured menu.
-- Requires migration 20261110000000_deal_menus.sql. Run once in the Supabase SQL Editor.

with kubo as (
  select id from public.venues where slug = 'kubo-asian-fusion-bar'
),
hh_menu as (
  select '[
    {"section": "Cocktails & wine", "items": [
      {"name": "Classic cocktails", "price": "$10.50"},
      {"name": "House martini", "price": "$10.50"},
      {"name": "Japanese yuzu highball", "price": "$12"},
      {"name": "On the rocks or mixed drink", "price": "$8.50"},
      {"name": "Wine by the glass", "price": "$6.50"},
      {"name": "Prosecco", "price": "$10"},
      {"name": "Cold sake", "price": "$10"}
    ]},
    {"section": "Beer", "items": [
      {"name": "Draft, 14 oz", "price": "$6"},
      {"name": "Draft, 22 oz", "price": "$9"},
      {"name": "Bottle, 12 oz", "price": "$5"},
      {"name": "Bucket of 6 bottles", "price": "$29"},
      {"name": "Beer tower, 3 L", "price": "$50"}
    ]},
    {"section": "Shots", "items": [
      {"name": "Sake bomb for 2", "price": "$10"},
      {"name": "Soju bomb for 2", "price": "$10"},
      {"name": "Soju flight", "price": "$12"},
      {"name": "Special shot", "price": "$9"}
    ]},
    {"section": "Small plates", "items": [
      {"name": "Salted edamame", "price": "$4.95"},
      {"name": "Spicy edamame", "price": "$6.95"},
      {"name": "Thai pork dumplings", "price": "$6.95"},
      {"name": "Chicken gyoza, steamed or fried", "price": "$6.95"},
      {"name": "Crab rangoon", "price": "$6.95"},
      {"name": "Veggie spring rolls", "price": "$6.95"},
      {"name": "Pork lumpia", "price": "$7.95"},
      {"name": "Japanese truffle fries", "price": "$8.95"},
      {"name": "Takoyaki", "price": "$9.95"},
      {"name": "Yakitori: 3 chicken or 5 pork skewers", "price": "$9.95"},
      {"name": "Chicken karaage", "price": "$9.95"}
    ]},
    {"section": "Sushi & raw bar", "items": [
      {"name": "Seaweed salad", "price": "$6.95"},
      {"name": "Spicy tuna bites", "price": "$10.95"},
      {"name": "Fresh oysters, 6 pcs", "price": "$13.95"},
      {"name": "Tuna tartare dip", "price": "$14.95"},
      {"name": "Tuna tataki", "price": "$14.95"},
      {"name": "Sushi appetizer, 6 pcs", "price": "$15.95"},
      {"name": "Sashimi appetizer, 9 pcs", "price": "$15.95"},
      {"name": "Scallop crudo", "price": "$16.95"},
      {"name": "Seared wahoo", "price": "$16.95"},
      {"name": "Spicy yellowtail", "price": "$17.95"}
    ]}
  ]'::jsonb as menu
)
update public.deals d
set
  menu = hh_menu.menu,
  details = case d.title
    when 'Happy hour: $6.50 wine, $10.50 cocktails, apps from $4.95' then 'Any table.'
    when 'Happy hour at the bar & high tops' then 'At the bar or a high top.'
    when 'Late-night happy hour' then 'Sports bar zone only.'
  end
from kubo, hh_menu
where d.venue_id = kubo.id
  and d.title in (
    'Happy hour: $6.50 wine, $10.50 cocktails, apps from $4.95',
    'Happy hour at the bar & high tops',
    'Late-night happy hour'
  );
