(define (domain agencia_viaje)
	(:requirements :strips :typing :fluents)
	(:types
		ciudad - ciudad
		hotel - hotel
		vuelo - vuelo
		dias_por_ciudad - dias_por_ciudad
	)
	(:functions
		(num_ciudades_escogidas)
		(num_dias_recorrido)

		(min_ciudades_a_recoger)
		(min_dias_recorrido)
		(min_dias_por_ciudad)
		(max_dias_por_ciudad)

		(dias_por_ciudad ?x - dias_por_ciudad)

		(interes_ciudad ?c - ciudad)
		(interes_actual)
	)
	(:predicates
		(va_a ?x - vuelo ?y - ciudad ?z - ciudad)
		(esta_en ?x - hotel ?y - ciudad)
		(ciudad_visitada ?c - ciudad)
		(current_ciudad ?c - ciudad)
	)

	(:action anadir_ciudad
		:parameters (?c1 - ciudad ?c2 - ciudad ?v - vuelo ?h - hotel ?d - dias_por_ciudad)
		:precondition (and
			(<= (min_dias_por_ciudad) (dias_por_ciudad ?d))
			(>= (max_dias_por_ciudad) (dias_por_ciudad ?d))
			(not (ciudad_visitada ?c2))
			(current_ciudad ?c1)
			(va_a ?v ?c1 ?c2)
			(esta_en ?h ?c2)
			)
		:effect (and
			(ciudad_visitada ?c2)
			(not (current_ciudad ?c1)) (current_ciudad ?c2)
			(increase (num_ciudades_escogidas) 1)
			(increase (num_dias_recorrido) (dias_por_ciudad ?d))
			(increase (interes_actual) (interes_ciudad ?c2))
			)
	)
	
)
