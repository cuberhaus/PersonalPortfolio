.PHONY: _db-tfg _db-bitsx _db-tenda _db-draculin _db-pro2 _db-planif \
        _db-desastres _db-mpids _db-phase _db-caim _db-joceda _db-sbcia \
        _db-rob _db-par _db-fib _db-grafics

STAMPS := .build-stamps
FIND_EXCLUDES := -not -path '*/node_modules/*' \
                 -not -path '*/.git/*' \
                 -not -path '*/dist/*' \
                 -not -path '*/__pycache__/*' \
                 -not -path '*/.next/*' \
                 -not -path '*/build/*' \
                 -not -path '*/.astro/*' \
                 -not -path '*/.gradle/*' \
                 -not -path '*/target/*' \
                 -not -name '*.pyc'

# $(1)=stamp name  $(2)=source dir  $(3)=label  $(4)=build command
define build_if_changed
	@if [ ! -d "$(2)" ]; then \
		echo "  ⏭  $(3) skipped (not found)"; \
	elif [ ! -f "$(STAMPS)/$(1)" ] || \
	     [ -n "$$(find "$(2)" $(FIND_EXCLUDES) -newer "$(STAMPS)/$(1)" -print -quit 2>/dev/null)" ]; then \
		echo "  🔨 $(3)  building…"; \
		S=$$(date +%s); \
		if $(4); then \
			mkdir -p "$(STAMPS)" && touch "$(STAMPS)/$(1)"; \
			E=$$(date +%s); D=$$((E - S)); \
			echo "  ✅ $(3)  done ($${D}s)"; \
		else \
			E=$$(date +%s); D=$$((E - S)); \
			echo "  ❌ $(3)  FAILED ($${D}s)"; \
			exit 1; \
		fi; \
	else \
		echo "  ✔  $(3)  up to date"; \
	fi
endef

# Use cached base images by default; 'make rebuild' pulls fresh ones
DOCKER_BUILD_OPTS ?=

DEMO_TARGETS := _db-tfg _db-bitsx _db-tenda _db-draculin _db-pro2 _db-planif \
                _db-desastres _db-mpids _db-phase _db-caim _db-joceda _db-sbcia \
                _db-rob _db-par _db-fib _db-grafics

_db-tfg:
	$(call build_if_changed,tfg,$(PARENT)/TFG,TFG              :8082,\
		docker compose -f "$(PARENT)/TFG/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-bitsx:
	$(call build_if_changed,bitsx,$(PARENT)/bitsXlaMarato,bitsXlaMarato    :8001,\
		docker compose -f "$(PARENT)/bitsXlaMarato/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-tenda:
	$(call build_if_changed,tenda,$(PARENT)/tenda_online,Tenda Online     :8888,\
		docker compose -f "$(PARENT)/tenda_online/docker/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-draculin:
	$(call build_if_changed,draculin,$(PARENT)/Draculin-Backend,Draculin         :8890,\
		docker compose -f "$(PARENT)/Draculin-Backend/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-pro2:
	$(call build_if_changed,pro2,$(PARENT)/pracpro2,pracpro2         :8000,\
		docker build $(DOCKER_BUILD_OPTS) -t pracpro2 "$(PARENT)/pracpro2")
_db-planif:
	$(call build_if_changed,planif,$(PARENT)/Practica_de_Planificacion,Planificacion    :3000,\
		docker build $(DOCKER_BUILD_OPTS) -t practica-planificacion "$(PARENT)/Practica_de_Planificacion")
_db-desastres:
	$(call build_if_changed,desastres,$(PARENT)/desastresIA,DesastresIA      :8083,\
		docker compose -f "$(PARENT)/desastresIA/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-mpids:
	$(call build_if_changed,mpids,$(PARENT)/projectA,MPIDS            :8084,\
		docker compose -f "$(PARENT)/projectA/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-phase:
	$(call build_if_changed,phase,$(PARENT)/projectA2,PhaseTransitions :8085,\
		docker compose -f "$(PARENT)/projectA2/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-caim:
	$(call build_if_changed,caim,$(PARENT)/CAIM,CAIM             :8086,\
		docker compose -f "$(PARENT)/CAIM/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-joceda:
	$(call build_if_changed,joceda,$(PARENT)/joc_eda,JocEDA           :8087,\
		docker compose -f "$(PARENT)/joc_eda/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-sbcia:
	$(call build_if_changed,sbcia,$(PARENT)/SBC_IA,SBC_IA           :8088,\
		docker compose -f "$(PARENT)/SBC_IA/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-rob:
	$(call build_if_changed,rob,$(PARENT)/ROB,ROB              :8092,\
		docker compose -f "$(PARENT)/ROB/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-par:
	$(call build_if_changed,par,$(PARENT)/PAR,PAR              :8089,\
		docker compose -f "$(PARENT)/PAR/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-fib:
	$(call build_if_changed,fib,$(PARENT)/fib,FIB              :8090,\
		docker compose -f "$(PARENT)/fib/docker-compose.yml" build $(DOCKER_BUILD_OPTS))
_db-grafics:
	$(call build_if_changed,grafics,$(PARENT)/fib/G/web,Grafics          :8093,\
		docker compose -f "$(PARENT)/fib/G/web/docker-compose.yml" build $(DOCKER_BUILD_OPTS))