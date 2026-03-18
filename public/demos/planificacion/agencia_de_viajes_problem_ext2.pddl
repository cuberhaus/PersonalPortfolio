(define (problem agencia_viaje)
	(:domain agencia_viaje)
	(:objects 
		cg1 c1 c2 c3 - ciudad
	    vg1 v1 v2 v3 - vuelo
		h1 h2 h3 - hotel
		dias1 dias2 dias3 dias4 - dias_por_ciudad
	)
	(:init 
		(= (num_ciudades_escogidas) 0)
		(= (min_ciudades_a_recoger) 2)

		(= (min_dias_por_ciudad) 1)
		(= (max_dias_por_ciudad) 4)
		(= (num_dias_recorrido) 0)
		(= (min_dias_recorrido) 10)
		(= (dias_por_ciudad dias1) 1)
		(= (dias_por_ciudad dias2) 2)
		(= (dias_por_ciudad dias3) 3)
		(= (dias_por_ciudad dias4) 4)

		(= (interes_actual) 0)
		(= (interes_ciudad c1) 1)
		(= (interes_ciudad c2) 2)
		(= (interes_ciudad c3) 3)
		(= (interes_ciudad cg1) 3)

		(current_ciudad cg1)
		(ciudad_visitada cg1)
		(va_a vg1 cg1 c1)
		(va_a vg1 cg1 c2)
		(va_a vg1 cg1 c3)
		(va_a v1 c1 c2)
		(va_a v2 c2 c3)
		(va_a v3 c3 c1)
		(esta_en h1 c1)
		(esta_en h2 c2)
		(esta_en h3 c3)
	)


	(:goal (and
		(<= (min_ciudades_a_recoger) (num_ciudades_escogidas))
		(<= (min_dias_recorrido) (num_dias_recorrido))
	))
	(:metric minimize 
		(interes_actual)
	)
)
