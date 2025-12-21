
export const globalVariables = [
    { name: '[half_diet_price]', desc: 'Preu configurat per a mitja dieta.' },
    { name: '[half_diet_price_value]', desc: 'Valor numèric del preu de mitja dieta.' },
    { name: '[full_diet_price]', desc: 'Preu configurat per a dieta completa.' },
    { name: '[full_diet_price_value]', desc: 'Valor numèric del preu de dieta completa.' },
    { name: '[current_month_label]', desc: 'Mes i any actual (ex. març 2024).' },
    { name: '[current_month_key]', desc: 'Clau tècnica del mes (YYYY-MM).' },
    { name: '[user_name]', desc: 'Nom de l\'usuari configurat.' },
    { name: '[user_surname]', desc: 'Cognoms de l\'usuari configurat.' },
    { name: '[user_dni]', desc: 'DNI/NIE de l\'usuari configurat.' }
]

export const monthlyVariables = [
    { name: '[month_service_count]', desc: 'Nombre de serveis en el període.' },
    { name: '[month_displacement_count]', desc: 'Nombre total de desplaçaments.' },
    { name: '[month_lunches]', desc: 'Total de dinars.' },
    { name: '[month_dinners]', desc: 'Total de sopars.' },
    { name: '[month_half_diets]', desc: 'Total de mitges dietes.' },
    { name: '[month_full_diets]', desc: 'Total de dietes completes.' },
    { name: '[month_diet_units]', desc: 'Unitats de dieta (completa=1, mitja=0.5).' },
    { name: '[month_kilometers]', desc: 'Total de quilòmetres registrats al mes.' },
    { name: '[month_allowance]', desc: 'Import total a percebre.' },
    { name: '[month_allowance_value]', desc: 'Valor numèric de l\'import total.' },
    { name: '[previous_month_last_working_day]', desc: 'Data de l\'últim dia laborable del mes anterior (ISO).' },
    { name: '[previous_month_last_working_day:human]', desc: 'Data de l\'últim dia laborable del mes anterior (Text).' },
    { name: '[previous_month_last_working_day_minus_1]', desc: 'Data del penúltim dia laborable del mes anterior (ISO).' },
    { name: '[previous_month_last_working_day_minus_1_human]', desc: 'Data del penúltim dia laborable del mes anterior (Text).' },
    { name: '[previous_month_last_working_day_minus_2]', desc: 'Data del 3r dia més recent laborable del mes anterior (ISO).' },
    { name: '[previous_month_last_working_day_minus_2_human]', desc: 'Data del 3r dia més recent laborable del mes anterior (Text).' }
]

export const serviceVariables = [
    { name: '[service_index]', desc: 'Número seqüencial del servei.' },
    { name: '[service_id]', desc: 'Identificador intern del servei.' },
    { name: '[service_reference]', desc: 'Referència única (SERV-YYYY-MM-DD-XX).' },
    { name: '[service_start_date]', desc: 'Data d\'inici (DD/MM/YYYY).' },
    { name: '[service_start_time]', desc: 'Hora d\'inici (HH:mm).' },
    { name: '[service_start_iso]', desc: 'Data i hora d\'inici (ISO).' },
    { name: '[service_end_date]', desc: 'Data de fi.' },
    { name: '[service_end_time]', desc: 'Hora de fi.' },
    { name: '[service_end_iso]', desc: 'Data i hora de fi (ISO).' },
    { name: '[service_duration_hours]', desc: 'Durada en hores.' },
    { name: '[service_displacement_count]', desc: 'Nombre de desplaçaments.' },
    { name: '[service_half_diets]', desc: 'Nombre de mitges dietes en aquest servei.' },
    { name: '[service_full_diets]', desc: 'Nombre de dietes completes en aquest servei.' },
    { name: '[service_lunches]', desc: 'Nombre de dinars en aquest servei.' },
    { name: '[service_dinners]', desc: 'Nombre de sopars en aquest servei.' },
    { name: '[service_total_lunches]', desc: 'Total de dinars (alias).' },
    { name: '[service_total_dinners]', desc: 'Total de sopars (alias).' },
    { name: '[service_kilometers]', desc: 'Total de quilòmetres del servei.' },
    { name: '[service_total_allowance]', desc: 'Import total del servei.' },
    { name: '[service_total_allowance_value]', desc: 'Valor numèric de l\'import total.' },
    { name: '[service_notes]', desc: 'Notes o observacions opcionals del servei.' }
]

export const displacementVariables = [
    { name: '[displacement_index]', desc: 'Número seqüencial del desplaçament.' },
    { name: '[displacement_id]', desc: 'Identificador intern.' },
    { name: '[displacement_province]', desc: 'Província.' },
    { name: '[displacement_municipality]', desc: 'Municipi.' },
    { name: '[displacement_municipality:limit3]', desc: 'Municipi (primeres 3 lletres).' },
    { name: '[displacement_has_lunch]', desc: 'Té dinar (Sí/No).' },
    { name: '[displacement_has_dinner]', desc: 'Té sopar (Sí/No).' },
    { name: '[displacement_meals]', desc: 'Descripció àpats (Dinar, Sopar, Dinar i sopar, —).' },
    { name: '[displacement_date]', desc: 'Data del desplaçament (igual a l\'inici del servei).' },
    { name: '[displacement_observations]', desc: 'Observacions específiques del desplaçament.' }
]

export const loops = [
    { name: '[loop:services] ... [endloop:services]', desc: 'Itera sobre cada servei del mes.' },
    { name: '[loop:service_displacements] ... [endloop:service_displacements]', desc: 'Itera sobre els desplaçaments d\'un servei (dins de loop:services).' },
    { name: '[loop:month_displacements] ... [endloop:month_displacements]', desc: 'Itera sobre tots els desplaçaments del mes, sense agrupar.' },
    { name: '[if:has_next] ... [endif:has_next]', desc: 'Mostra el contingut només si NO és l\'últim element. Ideal per a comes.' },
    { name: '[if:is_last] ... [endif:is_last]', desc: 'Mostra el contingut només si és l\'últim element.' },
    { name: '[if:is_first] ... [endif:is_first]', desc: 'Mostra el contingut només si és el primer element.' }
]
